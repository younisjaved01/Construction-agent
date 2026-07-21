#!/usr/bin/env bash
# Resumable render of IslamicReflection (muted chunks) -> concat -> mux the real
# ElevenLabs narration (offset to its start frame) -> compress for delivery.
set -e
cd "$(dirname "$0")"
export REMOTION_CHROME_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

TOTAL=$(node -e "console.log(require('./src/config/reflection.config.json').composition.durationInFrames)")
STARTF=$(node -e "console.log(require('./src/config/reflection.config.json').narration.startFrame)")
FPS=60
CHUNK=520
DELAY_MS=$(node -e "console.log(Math.round($STARTF/$FPS*1000))")

mkdir -p out/chunks
i=0; start=0; : > out/concat.txt
while [ "$start" -lt "$TOTAL" ]; do
  end=$(( start + CHUNK - 1 )); [ "$end" -ge "$TOTAL" ] && end=$(( TOTAL - 1 ))
  want=$(( end - start + 1 )); need=$want; [ "$want" -ge 500 ] && need=500
  f="out/chunks/rc_$i.mp4"
  have=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null || echo 0)
  if [ "${have:-0}" -ge "$need" ]; then echo "[$i] cached ($have)"; else
    echo "[$i] rendering $start-$end ..."
    npx remotion render IslamicReflection "$f" --codec=h264 --crf=16 --muted \
      --frames="$start-$end" --concurrency=4 --browser-executable="$REMOTION_CHROME_EXECUTABLE"
  fi
  echo "file 'chunks/rc_$i.mp4'" >> out/concat.txt
  i=$(( i + 1 )); start=$(( end + 1 ))
done

echo "=== concat video ==="
ffmpeg -y -v error -f concat -safe 0 -i out/concat.txt -c copy out/rc_video.mp4
echo "=== mux narration (delayed ${DELAY_MS}ms) ==="
ffmpeg -y -v error -i out/rc_video.mp4 -i public/narration.mp3 \
  -filter_complex "[1:a]adelay=${DELAY_MS}|${DELAY_MS},aresample=48000[a]" \
  -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 192k out/IslamicReflection_master.mp4
echo "=== compress for delivery ==="
ffmpeg -y -v error -i out/IslamicReflection_master.mp4 -c:v libx264 -b:v 4600k -pass 1 -preset medium -an -f mp4 /dev/null
ffmpeg -y -v error -i out/IslamicReflection_master.mp4 -c:v libx264 -b:v 4600k -pass 2 -preset medium \
  -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart out/IslamicReflection_final.mp4
rm -f ffmpeg2pass-*.log*
echo "DONE"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames:format=duration -of default=noprint_wrappers=1 out/IslamicReflection_master.mp4
du -m out/IslamicReflection_final.mp4
