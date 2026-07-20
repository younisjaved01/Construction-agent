#!/usr/bin/env bash
# Resumable full render: muted video in chunks -> concat -> mux audio -> compress.
# Safe to re-run: finished chunks are skipped.
set -e
cd "$(dirname "$0")"
export REMOTION_CHROME_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell

CHUNK=516            # frames per chunk (2580 / 5)
TOTAL=2580
FPS=60
MIN_SEC=8.4         # a complete 516-frame chunk is 8.6s; below this = re-render

mkdir -p out/chunks
i=0; start=0
: > out/concat.txt
while [ "$start" -lt "$TOTAL" ]; do
  end=$(( start + CHUNK - 1 )); [ "$end" -ge "$TOTAL" ] && end=$(( TOTAL - 1 ))
  f="out/chunks/chunk_$i.mp4"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null || echo 0)
  ok=$(awk -v d="$dur" -v m="$MIN_SEC" 'BEGIN{print (d+0>=m)?1:0}')
  if [ "$ok" = "1" ]; then
    echo "[$i] cached ($dur s)"
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
echo "=== compress for delivery (<30MB) ==="
ffmpeg -y -v error -i out/QuranShort_master.mp4 -c:v libx264 -preset slow -crf 25 \
  -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart out/QuranShort_deliver.mp4

echo "DONE"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate:format=duration -of default=noprint_wrappers=1 out/QuranShort_master.mp4
echo "master MiB:"; du -m out/QuranShort_master.mp4
echo "deliver MiB:"; du -m out/QuranShort_deliver.mp4
