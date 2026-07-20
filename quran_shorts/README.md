# Qur'an Shorts pipeline

Builds vertical **9:16 (1080×1920) YouTube Shorts** (≤58 s, H.264/AAC, 30 fps)
from freely-redistributable Qur'an recitations, with mastered audio, a cinematic
background, a dark legibility overlay, and burned-in Arabic + English captions
that fade in per verse and stay synced to the recitation.

Configured out of the box for **Surah Al-Mu'minun (23)**, Sheikh **Yasser
Al-Dosari**, 3 Shorts.

## On rights (read this)

This defaults to **[EveryAyah.com](https://everyayah.com/)**, which hosts
recitations shared for **free redistribution**, and to the **alquran.cloud**
API for verse text/translation. That's why the output is clean to publish:
you actually have the right to use the source — nothing here obfuscates or
hides audio to slip past Content-ID.

Confirm the licence for the specific reciter folder you use. If you swap in a
different source, only use audio you **own or are licensed to use**.

## Requirements

- **FFmpeg** (provides `ffmpeg` + `ffprobe`) — the only hard dependency.
- **Python 3.10+** — standard library only, no `pip install` needed.
- An **Arabic font** for proper shaping. Amiri is recommended.

```bash
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y ffmpeg fonts-hosny-amiri fonts-dejavu
# macOS (Homebrew)
brew install ffmpeg && brew install --cask font-amiri
```

If you can't install Amiri system-wide, drop `Amiri-Regular.ttf` into the
`fonts/` folder (the script passes it to libass via `fontsdir`).

## Run

```bash
cd quran_shorts

# Verify FFmpeg + Arabic fonts render correctly (offline, no downloads) FIRST:
python3 make_shorts.py --self-test     # writes output/self_test.mp4

python3 make_shorts.py                 # 3 Shorts from Surah 23, Al-Dosari
```

Open `output/self_test.mp4` and confirm the background animates, the overlay
dims it, and the Arabic renders as connected script (not empty boxes). If the
Arabic is broken, install an Arabic font or drop `Amiri-Regular.ttf` in `fonts/`.

Outputs land in `output/` as `short_01_*.mp4`, `short_02_*.mp4`, …
Downloaded ayah audio + intermediate files are cached in `work/`.

### Useful options

```bash
# Use your own royalty-free 9:16 loop instead of the generated background
python3 make_shorts.py --background assets/starfield_9x16.mp4

# Layer a subtle ambient bed (rain/wind/room) under the recitation
python3 make_shorts.py --ambient assets/soft_rain.mp3

# Pick specific verse starting points (it accumulates to ~30–55 s from each)
python3 make_shorts.py --starts 99,115,78

# Arabic only, darker overlay, different reciter folder
python3 make_shorts.py --no-english --dim 0.38 --reciter Yasser_Ad-Dussary_128kbps

# A different surah — curated passages exist for 18, 23, 36, 55, 67, 93, 94;
# any other surah falls back to walking from ayah 1.
python3 make_shorts.py --surah 67
```

Full list: `python3 make_shorts.py --help`.

> **Reciter folder:** if downloads 404, browse <https://everyayah.com/data/> for
> the exact folder name and pass it via `--reciter`.

## What each stage does

| Stage | Tool | Detail |
|------|------|--------|
| Verse text + translation | alquran.cloud API | `quran-uthmani` + `en.sahih` |
| Recitation audio | EveryAyah (per-ayah MP3) | exact, real verse boundaries |
| Segmentation | Python | groups consecutive ayat into 30–55 s |
| Audio master | FFmpeg | EQ (bass 150 Hz +3 dB, treble 5 kHz +2.5 dB) → subtle room reverb → optional ambient bed → `loudnorm` to −14 LUFS |
| Background | FFmpeg | your 9:16 loop, or generated animated gradient; scaled/cropped to 1080×1920 |
| Legibility | FFmpeg | ~32 % dark overlay + vignette |
| Captions | libass (.ass) | centered gold Arabic + white English, black shadow, per-verse `\fad` |
| Export | libx264/AAC | 1080×1920, 30 fps, `+faststart`, ≤58 s |

**Note on audio:** the pitch/tempo shift from the original brief is intentionally
omitted. The mastering chain here is for genuine loudness/tonal quality (so it
sounds great and meets YouTube's −14 LUFS spec), not to defeat fingerprinting.

## Raw CLI reference

The Python script orchestrates these; here are the standalone equivalents.

**Download one ayah (EveryAyah):**
```bash
curl -O https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/023099.mp3
```

**Master + concatenate audio:**
```bash
ffmpeg -y -i 023099.mp3 -i 023100.mp3 \
  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[c];\
[c]equalizer=f=150:t=q:w=1.2:g=3,equalizer=f=5000:t=q:w=1.5:g=2.5,\
aecho=0.8:0.9:55|75:0.22|0.16,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[a]" -c:a aac -b:a 192k segment.m4a
```

**Render the Short (generated background):**
```bash
ffmpeg -y \
  -f lavfi -i "gradients=s=1080x1920:speed=0.012:c0=0x060d1f:c1=0x0e2038:\
c2=0x14324f:c3=0x02060f:nb_colors=4:duration=48" \
  -i segment.m4a \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,\
crop=1080:1920,fps=30,setsar=1,drawbox=color=black@0.32:t=fill,vignette=PI/5,\
subtitles='segment.ass':fontsdir='fonts'[v]" \
  -map "[v]" -map 1:a -t 48 -r 30 \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart short.mp4
```

## Using a source you're licensed to (yt-dlp)

If you have rights to a specific recording (your own, or a licensed one) and
want to pull it with `yt-dlp` instead of EveryAyah, grab the audio and cut your
segment by timestamp, then feed it to the same render/master steps:

```bash
# 1) download audio you are licensed to use
yt-dlp -x --audio-format mp3 -o source.mp3 "<URL_YOU_ARE_LICENSED_FOR>"

# 2) cut a 30–55 s segment (e.g. 04:12 → 05:02)
ffmpeg -y -ss 00:04:12 -to 00:05:02 -i source.mp3 -c copy segment_raw.mp3

# 3) master it (same chain as above) and render (same render command as above)
```

`make_shorts.py` keeps EveryAyah as the default because per-ayah files give
exact verse boundaries and clean redistribution rights.

## Free 9:16 background sources

Cinematic vertical loops (starfields, clouds, ocean, particles) under permissive
licences: **Pexels Videos**, **Pixabay**, **Coverr**, **Mixkit**. Download a 9:16
clip and pass it with `--background`.
