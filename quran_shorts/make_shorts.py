#!/usr/bin/env python3
"""
make_shorts.py — Build 9:16 Qur'an Shorts from freely-redistributable recitations.

Pipeline (per Short):
  1. Fetch verse text (Arabic + English) from the free alquran.cloud API.
  2. Download per-ayah audio from EveryAyah.com (freely-redistributable source).
     Group consecutive ayat into a 30–55 s segment.
  3. Master the audio in FFmpeg: parametric EQ (bass + treble), subtle room
     reverb, optional ambient bed, loudness-normalise to YouTube's -14 LUFS.
     (This is production mastering — NOT fingerprint/Content-ID evasion.)
  4. Build a 1080x1920 background (your own royalty-free loop, or a locally
     generated cinematic gradient) + dark dim overlay + vignette for legibility.
  5. Burn in centered Arabic typography (gold, shadowed) with per-verse fade-in,
     and optional English translation underneath, timed to the recitation.
  6. Export 1080x1920 H.264/AAC, 30 fps, <= 58 s MP4.

Only external system tools required: ffmpeg, ffprobe. (yt-dlp optional; see README.)
No Python packages required beyond the standard library.

IMPORTANT — rights: This defaults to EveryAyah, whose recitations are shared for
free redistribution. Confirm the licence for the reciter you pick. If you instead
point this at another source, only use audio you own or are licensed to use.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import urllib.request
from dataclasses import dataclass, field

# --------------------------------------------------------------------------- #
# Sources
# --------------------------------------------------------------------------- #

ALQURAN_API = "https://api.alquran.cloud/v1/surah/{surah}/{edition}"
# EveryAyah per-ayah audio: <base>/<reciter>/SSSAAA.mp3  (surah/ayah zero-padded)
EVERYAYAH_BASE = "https://everyayah.com/data"

# EveryAyah folder for Sheikh Yasser Al-Dosari. If a download 404s, list the
# available folders at https://everyayah.com/data/ and override with --reciter.
DEFAULT_RECITER = "Yasser_Ad-Dussary_128kbps"

# Curated "start ayat" for well-known, emotionally resonant passages, ordered by
# impact. The pipeline accumulates forward from each start until it reaches the
# target duration, so these are just entry points. Add your own surahs here.
CURATED_STARTS = {
    23: [  # Surah Al-Mu'minun
        99,   # "...My Lord, send me back" — the regret at death (al-barzakh)
        115,  # "Did you then think that We created you uselessly?"
        78,   # "It is He who produced for you hearing, vision and hearts..."
        12,   # The creation of man from an extract of clay
        1,    # "Certainly the believers have succeeded..."
        57,   # Those who are fearful of their Lord
    ],
    67: [1, 3, 13, 19, 30],       # Al-Mulk — dominion, the birds, the water
    36: [1, 12, 33, 77, 82],      # Ya-Sin — signs, resurrection, "Be, and it is"
    55: [1, 13, 26, 46, 60],      # Ar-Rahman — "which of your Lord's favours..."
    93: [1, 3, 5, 9, 11],         # Ad-Duha — comfort after hardship
    94: [1, 5, 7],                # Ash-Sharh — "with hardship comes ease"
    18: [1, 10, 23, 45, 103],     # Al-Kahf — the cave, worldly life as a parable
}

GOLD = "&H0000D7FF"   # ASS is &HAABBGGRR: gold = RGB(255,215,0)
WHITE = "&H00FFFFFF"
BLACK = "&H00000000"
SHADOW = "&H64000000"  # ~40% black for the soft shadow/back colour


# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

@dataclass
class Config:
    surah: int = 23
    reciter: str = DEFAULT_RECITER
    num_shorts: int = 3
    min_seconds: float = 30.0
    max_seconds: float = 55.0
    hard_cap: float = 58.0
    english: bool = True
    background: str | None = None       # path or URL to a 9:16 loop
    ambient: str | None = None          # path to a low-volume ambient bed (rain/wind/room)
    dim: float = 0.32                   # dark overlay opacity (0.30–0.40 recommended)
    arabic_font: str = "Amiri"
    english_font: str = "DejaVu Sans"
    fonts_dir: str = "fonts"
    starts: list[int] = field(default_factory=list)
    outdir: str = "output"
    workdir: str = "work"
    crf: int = 20
    preset: str = "medium"


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #

def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def require_tools() -> None:
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            die(f"'{tool}' not found on PATH. Install FFmpeg (which bundles ffprobe).")


def run(cmd: list[str], quiet: bool = True) -> None:
    """Run a subprocess, streaming ffmpeg errors if it fails."""
    proc = subprocess.run(
        cmd,
        stdout=subprocess.DEVNULL if quiet else None,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr or "")
        die(f"command failed: {' '.join(cmd[:6])} ...")


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "quran-shorts/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def download(url: str, dest: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "quran-shorts/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f)


def probe_duration(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        text=True,
    ).strip()
    return float(out)


def ass_time(seconds: float) -> str:
    """Seconds -> H:MM:SS.cs for ASS/SSA timing."""
    cs = int(round(seconds * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("\n", "\\N").strip()


# --------------------------------------------------------------------------- #
# Text + audio acquisition
# --------------------------------------------------------------------------- #

def fetch_surah_text(surah: int, want_english: bool) -> dict[int, dict]:
    """Return {ayah_number_in_surah: {"ar": str, "en": str}}."""
    print(f"  fetching verse text for surah {surah} ...")
    ar = fetch_json(ALQURAN_API.format(surah=surah, edition="quran-uthmani"))
    verses: dict[int, dict] = {}
    for a in ar["data"]["ayahs"]:
        verses[a["numberInSurah"]] = {"ar": a["text"], "en": ""}
    if want_english:
        en = fetch_json(ALQURAN_API.format(surah=surah, edition="en.sahih"))
        for a in en["data"]["ayahs"]:
            if a["numberInSurah"] in verses:
                verses[a["numberInSurah"]]["en"] = a["text"]
    return verses


def ayah_audio_url(cfg: Config, ayah: int) -> str:
    return f"{EVERYAYAH_BASE}/{cfg.reciter}/{cfg.surah:03d}{ayah:03d}.mp3"


def get_ayah_audio(cfg: Config, ayah: int) -> tuple[str, float]:
    """Download one ayah (cached) and return (path, duration)."""
    adir = os.path.join(cfg.workdir, "ayat")
    os.makedirs(adir, exist_ok=True)
    path = os.path.join(adir, f"{cfg.surah:03d}{ayah:03d}.mp3")
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        download(ayah_audio_url(cfg, ayah), path)
    return path, probe_duration(path)


def build_segment(cfg: Config, start: int, max_ayah: int) -> tuple[list[dict], float]:
    """Accumulate ayat from `start` into one 30–55 s segment."""
    items: list[dict] = []
    total = 0.0
    ayah = start
    while ayah <= max_ayah and total < cfg.max_seconds:
        path, dur = get_ayah_audio(cfg, ayah)
        # Don't blow past the ceiling once we already have a usable segment.
        if items and total + dur > cfg.max_seconds:
            break
        items.append({"ayah": ayah, "path": path, "dur": dur, "offset": total})
        total += dur
        ayah += 1
        if total >= cfg.min_seconds:
            break
    return items, min(total, cfg.hard_cap)


# --------------------------------------------------------------------------- #
# Audio mastering
# --------------------------------------------------------------------------- #

def master_audio(cfg: Config, items: list[dict], out_path: str) -> None:
    """Concatenate the ayah files and apply the mastering chain."""
    # Parametric EQ (warm low-mids + crisp presence) -> subtle room reverb ->
    # loudness normalise to YouTube's -14 LUFS integrated target.
    chain = (
        "equalizer=f=150:t=q:w=1.2:g=3,"     # gentle bass warmth ~150 Hz
        "equalizer=f=5000:t=q:w=1.5:g=2.5,"  # treble clarity ~5 kHz
        "aecho=0.8:0.9:55|75:0.22:0.16,"     # subtle ambient room space
        "loudnorm=I=-14:TP=-1.5:LRA=11"
    )

    n = len(items)
    inputs: list[str] = []
    for it in items:
        inputs += ["-i", it["path"]]

    if cfg.ambient:
        # Mix the recitation (mastered) with a low-volume looping ambient bed.
        inputs += ["-stream_loop", "-1", "-i", cfg.ambient]
        concat_in = "".join(f"[{i}:a]" for i in range(n))
        filt = (
            f"{concat_in}concat=n={n}:v=0:a=1[voice];"
            f"[voice]{chain}[vv];"
            f"[{n}:a]volume=-22dB,aformat=channel_layouts=stereo[amb];"
            f"[vv][amb]amix=inputs=2:duration=first:dropout_transition=0[a]"
        )
    else:
        concat_in = "".join(f"[{i}:a]" for i in range(n))
        filt = f"{concat_in}concat=n={n}:v=0:a=1[c];[c]{chain}[a]"

    run(["ffmpeg", "-y", *inputs, "-filter_complex", filt,
         "-map", "[a]", "-c:a", "aac", "-b:a", "192k", out_path])


# --------------------------------------------------------------------------- #
# Subtitles (.ass)
# --------------------------------------------------------------------------- #

def build_ass(cfg: Config, verses: dict[int, dict], items: list[dict],
              out_path: str) -> None:
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Arabic,{cfg.arabic_font},74,{GOLD},{WHITE},{BLACK},{SHADOW},0,0,0,0,100,100,0,0,1,3,2,5,90,90,0,1
Style: English,{cfg.english_font},40,{WHITE},{WHITE},{BLACK},{SHADOW},0,0,0,0,100,100,0,0,1,2,2,5,140,140,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for it in items:
        start = ass_time(it["offset"])
        end = ass_time(min(it["offset"] + it["dur"], cfg.hard_cap))
        v = verses.get(it["ayah"], {"ar": "", "en": ""})
        ar = ass_escape(v["ar"])
        # Arabic: upper-middle, centered, fade in/out.
        lines.append(
            f"Dialogue: 0,{start},{end},Arabic,,0,0,0,,"
            f"{{\\pos(540,760)\\fad(450,300)}}{ar}"
        )
        if cfg.english and v.get("en"):
            en = ass_escape(v["en"])
            lines.append(
                f"Dialogue: 0,{start},{end},English,,0,0,0,,"
                f"{{\\pos(540,1170)\\fad(450,300)}}{en}"
            )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


# --------------------------------------------------------------------------- #
# Final render
# --------------------------------------------------------------------------- #

def background_input(cfg: Config, duration: float) -> list[str]:
    """FFmpeg input args for the background, looped/generated to `duration`."""
    if cfg.background:
        # Loop a user-supplied royalty-free 9:16 clip to cover the duration.
        return ["-stream_loop", "-1", "-i", cfg.background]
    # Fallback: locally generated cinematic deep-space gradient (animated).
    d = math.ceil(duration) + 1
    src = (
        f"gradients=s=1080x1920:x0=180:y0=200:x1=920:y1=1720:"
        f"c0=0x060d1f:c1=0x0e2038:c2=0x14324f:c3=0x02060f:"
        f"nb_colors=4:seed=7:speed=0.012:duration={d}"
    )
    return ["-f", "lavfi", "-i", src]


def render_short(cfg: Config, duration: float, audio_path: str,
                 ass_path: str, out_path: str) -> None:
    dur = min(duration, cfg.hard_cap)
    dim = max(0.0, min(cfg.dim, 0.6))

    # subtitles filter needs escaped path chars.
    ass_escaped = ass_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    fonts_arg = ""
    if os.path.isdir(cfg.fonts_dir):
        fdir = cfg.fonts_dir.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        fonts_arg = f":fontsdir='{fdir}'"

    vfilter = (
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,fps=30,setsar=1,"
        f"drawbox=x=0:y=0:w=iw:h=ih:color=black@{dim:.2f}:t=fill,"
        "vignette=PI/5,"
        f"subtitles='{ass_escaped}'{fonts_arg}[v]"
    )

    cmd = [
        "ffmpeg", "-y",
        *background_input(cfg, dur),
        "-i", audio_path,
        "-filter_complex", vfilter,
        "-map", "[v]", "-map", "1:a",
        "-t", f"{dur:.3f}",
        "-r", "30",
        "-c:v", "libx264", "-preset", cfg.preset, "-crf", str(cfg.crf),
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        out_path,
    ]
    run(cmd)


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #

def make_all(cfg: Config) -> None:
    require_tools()
    os.makedirs(cfg.workdir, exist_ok=True)
    os.makedirs(cfg.outdir, exist_ok=True)

    verses = fetch_surah_text(cfg.surah, cfg.english)
    max_ayah = max(verses)

    starts = cfg.starts or CURATED_STARTS.get(cfg.surah)
    if not starts:
        # No curated passages for this surah: walk it from the top.
        starts = list(range(1, max_ayah + 1))
    starts = [s for s in starts if s <= max_ayah]

    produced = 0
    used_first: set[int] = set()
    for start in starts:
        if produced >= cfg.num_shorts:
            break
        if start in used_first:
            continue
        items, total = build_segment(cfg, start, max_ayah)
        if not items or total < cfg.min_seconds * 0.6:
            continue
        used_first.add(start)
        produced += 1

        last = items[-1]["ayah"]
        tag = f"surah{cfg.surah}_ayah{start}-{last}"
        print(f"[{produced}/{cfg.num_shorts}] {tag}  ({total:.1f}s, {len(items)} ayat)")

        audio_path = os.path.join(cfg.workdir, f"{tag}.m4a")
        ass_path = os.path.join(cfg.workdir, f"{tag}.ass")
        out_path = os.path.join(cfg.outdir, f"short_{produced:02d}_{tag}.mp4")

        print("  mastering audio ...")
        master_audio(cfg, items, audio_path)
        # Use the real mastered duration for perfectly-synced visuals/captions.
        total = min(probe_duration(audio_path), cfg.hard_cap)
        print("  writing subtitles ...")
        build_ass(cfg, verses, items, ass_path)
        print("  rendering video ...")
        render_short(cfg, total, audio_path, ass_path, out_path)
        print(f"  -> {out_path}")

    if produced == 0:
        die("No segments produced. Check --reciter folder name and network access.")
    print(f"\nDone. {produced} Short(s) in ./{cfg.outdir}/")


def self_test(cfg: Config) -> None:
    """Render a short sample offline (no network / no EveryAyah) to verify that
    FFmpeg, the background, the dark overlay, and Arabic font shaping all work
    before committing to any downloads."""
    require_tools()
    os.makedirs(cfg.workdir, exist_ok=True)
    os.makedirs(cfg.outdir, exist_ok=True)

    verses = {
        1: {"ar": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            "en": "In the name of Allah, the Entirely Merciful, the Especially Merciful."},
        2: {"ar": "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
            "en": "All praise is due to Allah, Lord of the worlds."},
    }
    items = [
        {"ayah": 1, "path": "", "dur": 3.5, "offset": 0.0},
        {"ayah": 2, "path": "", "dur": 3.5, "offset": 3.5},
    ]
    dur = 7.0

    audio = os.path.join(cfg.workdir, "selftest.m4a")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
         "-t", f"{dur}", "-c:a", "aac", "-b:a", "192k", audio])

    ass = os.path.join(cfg.workdir, "selftest.ass")
    build_ass(cfg, verses, items, ass)

    out = os.path.join(cfg.outdir, "self_test.mp4")
    print("rendering offline self-test ...")
    render_short(cfg, dur, audio, ass, out)
    print(f"\nself-test OK -> {out}")
    print("Open it and confirm: background moves, overlay dims it, and the "
          "Arabic renders as connected script (not boxes). If the Arabic looks "
          "broken, install an Arabic font (e.g. Amiri) or drop the .ttf in "
          f"'{cfg.fonts_dir}/'.")


def parse_args() -> tuple[Config, bool]:
    p = argparse.ArgumentParser(description="Build 9:16 Qur'an Shorts.")
    p.add_argument("--surah", type=int, default=23)
    p.add_argument("--reciter", default=DEFAULT_RECITER,
                   help="EveryAyah reciter folder name.")
    p.add_argument("--num-shorts", type=int, default=3)
    p.add_argument("--min-seconds", type=float, default=30.0)
    p.add_argument("--max-seconds", type=float, default=55.0)
    p.add_argument("--starts", default="",
                   help="Comma-separated ayah start numbers (overrides curated list).")
    p.add_argument("--no-english", action="store_true", help="Arabic only.")
    p.add_argument("--background", default=None,
                   help="Path/URL to a royalty-free 9:16 loop. Omit to auto-generate.")
    p.add_argument("--ambient", default=None,
                   help="Path to a low-volume ambient bed (rain/wind/room).")
    p.add_argument("--dim", type=float, default=0.32,
                   help="Dark overlay opacity 0.30–0.40 for caption legibility.")
    p.add_argument("--arabic-font", default="Amiri")
    p.add_argument("--english-font", default="DejaVu Sans")
    p.add_argument("--fonts-dir", default="fonts")
    p.add_argument("--outdir", default="output")
    p.add_argument("--workdir", default="work")
    p.add_argument("--crf", type=int, default=20)
    p.add_argument("--preset", default="medium")
    p.add_argument("--self-test", action="store_true",
                   help="Render a sample offline to verify FFmpeg + fonts, then exit.")
    a = p.parse_args()

    starts = [int(x) for x in a.starts.split(",") if x.strip()] if a.starts else []
    cfg = Config(
        surah=a.surah, reciter=a.reciter, num_shorts=a.num_shorts,
        min_seconds=a.min_seconds, max_seconds=a.max_seconds,
        english=not a.no_english, background=a.background, ambient=a.ambient,
        dim=a.dim, arabic_font=a.arabic_font, english_font=a.english_font,
        fonts_dir=a.fonts_dir, starts=starts, outdir=a.outdir, workdir=a.workdir,
        crf=a.crf, preset=a.preset,
    )
    return cfg, a.self_test


if __name__ == "__main__":
    config, do_self_test = parse_args()
    if do_self_test:
        self_test(config)
    else:
        make_all(config)
