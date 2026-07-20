#!/usr/bin/env bash
# Resumable full render: muted video in chunks -> concat -> mux audio -> compress.
# Safe to re-run: finished chunks are skipped. Reads TOTAL from the config.
set -e
cd "$(dirname "$0")"
export REMOTION_CHROME_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

TOTAL=$(python3 -c "import json;print(json.load(open('src/config/quran.config.json'))['composition']['durationInFrames'])")
CHUNK=516
FPS=60
MIN_FR=500          # a full chunk is 516 frames; fewer complete frames => re-render

mkdir -p out/chunks
i=0; start=0
: > out/concat.txt
while [ "$start" -lt "$TOTAL" ]; do
  end=$(( start + CHUNK - 1 )); [ "$end" -ge "$TOTAL" ] && end=$(( TOTAL - 1 ))
  want=$(( end - start + 1 ))
  f="out/chunks/chunk_$i.mp4"
  have=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null || echo 0)
  # a chunk is "done" if it holds ~all its frames (last chunk may be short)
  need=$want; [ "$want" -ge "$MIN_FR" ] && need=$MIN_FR
  if [ "${have:-0}" -ge "$need" ]; then
    echo "[$i] cached ($have frames)"
  else
    echo "[$i] rendering frames $start-$end ..."
    npx remotion render QuranShort "$f" --codec=h264 --crf=17 --muted \
      --frames="$start-$end" --concurrency=4 \
      --browser-executable="$REMOTION_CHROME_EXECUTABLE"
  fi
  echo "file 'chunks/chunk_$i.mp4'" >> out/concat.txt
  i=$(( i + 1 )); start=$(( end + 1 ))
done

echo "=== concat ==="
ffmpeg -y -v error -f concat -safe 0 -i out/concat.txt -c copy out/video_full.mp4
echo "=== mux audio ==="
ffmpeg -y -v error -i out/video_full.mp4 -i out/audio_full.m4a \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/QuranShort_master.mp4
echo "=== compress for delivery (two-pass ~4700k -> <30MB) ==="
ffmpeg -y -v error -i out/QuranShort_master.mp4 -c:v libx264 -b:v 4700k -pass 1 -preset medium -an -f mp4 /dev/null
ffmpeg -y -v error -i out/QuranShort_master.mp4 -c:v libx264 -b:v 4700k -pass 2 -preset medium \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out/QuranShort_final.mp4
rm -f ffmpeg2pass-*.log*

echo "DONE"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames:format=duration -of default=noprint_wrappers=1 out/QuranShort_master.mp4
echo "final MiB:"; du -m out/QuranShort_final.mp4
