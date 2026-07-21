# Qur'an Cinematic — Remotion

> **Two pipelines live here:**
> - **`IslamicReflection`** — original, **monetizable** Short: Qur'an Arabic *text*
>   + your own AI English narration + an original reflection + Captions.ai-style
>   captions. No third-party recitation, so nothing to Content-ID claim. **← new**
> - **`QuranShort`** — the earlier recitation-based cinematic Short.

## IslamicReflection — automated, original, monetizable

You provide three things in `scripts/brief.json`:

1. the **verse** (Arabic text + reference),
2. the **English translation**,
3. a **background** image/footage path (in `public/`).

Then:

```bash
# 1) generate narration + word-timed captions  (needs a TTS key for real voice)
NARRATION_PROVIDER=elevenlabs ELEVENLABS_API_KEY=sk_... npm run generate
#    ...or run offline with estimated timings and no audio:
npm run generate

# 2) render the Short
npm run render          # out/reflection.mp4 (1080x1920, 60fps)
```

`generate` writes `src/config/reflection.config.json` (all frames + word timings
derived from the narration), then the composition reads it. The reflection can
be written by you in the brief, or auto-generated from the verse meaning if you
set `ANTHROPIC_API_KEY` (faithful, uplifting, < 60 words).

**Narration order** (built automatically): 2 s pause → English translation →
pause → original reflection → "May Allah guide us all." The recitation is never
used — the voice is your licensed AI TTS.

**Providers:** `elevenlabs` (recommended — returns word timestamps, so captions
are exact) and `mock` (offline, no audio) ship today; add OpenAI/Azure by
implementing the `{ audio, words }` contract in `scripts/lib/tts.mjs`.

### Reflection components

```
src/reflection/
  IslamicReflection.tsx     assembles all layers
  lib/theme.ts              gold/white/charcoal palette + fonts
  lib/timing.ts             caption chunking / word-state helpers
  components/
    BackgroundMotion.tsx    Ken Burns + parallax + grade + rays + fog + vignette
    ParticleSystem.tsx      floating dust motes
    VerseDisplay.tsx        Arabic centerpiece (gold, glow, reveal)
    Translation.tsx         luxury serif English, synced word highlight
    CaptionAnimation.tsx    Captions.ai-style word-by-word captions (reusable)
    Reflection.tsx          reflection delivered via CaptionAnimation
    Narration.tsx           the AI narration audio track
    Intro.tsx / Outro.tsx   "Today's Quran Reflection" / share call-to-action
```
Colours: gold `#D4AF37`, white, dark charcoal, soft warm glow. Captions stay
inside the Shorts safe area.

---

# Qur'an Cinematic (recitation) — Remotion

A premium, cinematic Qur'an recitation Short built with **Remotion + React +
TypeScript**. Everything — verses, timing, typography mood, audio, background —
is driven by a single JSON file, so a new Short is a new config + assets, no
code changes.

Vertical **1080 × 1920 @ 60 fps**, tuned for YouTube Shorts / Reels / TikTok.
Calm, minimal, legible — motion over flash, full respect for the text.

## Quick start

```bash
cd remotion
npm install

# add your assets (see "Assets" below), then:
npm run dev        # open Remotion Studio to preview + scrub
npm run render     # export out/video.mp4 (H.264, high bitrate, 60fps)
npm run still -- --frame=520   # export a single frame
npm run typecheck  # tsc --noEmit
```

> **Browser:** on a machine without Chrome, point Remotion at one:
> `REMOTION_CHROME_EXECUTABLE=/path/to/chrome npm run render`, or run
> `npx remotion browser ensure` once to download Remotion's headless shell.

## Assets (`public/`)

Bring your own (they're git-ignored):

| File | What |
|------|------|
| `public/recitation.mp3` | the recitation — **played untouched** |
| `public/ambience.mp3`   | soft river/birds/wind bed (looped, ~ −30 dB) |
| `public/bg/img1..3.jpg` | background photos or footage |

Set their paths/mood in `src/config/quran.config.json`.

## Configure everything in one JSON

`src/config/quran.config.json` (typed by `src/config/types.ts`):

- **composition** — width / height / fps / total frames
- **surah** — name, Arabic name, number, verse range (used by the ending)
- **audio** — recitation file + start frame, ambience file + dB
- **background** — `images` or `video`, sources, Ken Burns zoom, crossfade
  length, and the full **grade** (warmth, saturation, contrast, brightness,
  scrim, vignette, bloom, fog)
- **particles** — dust count + opacity
- **opening** — Bismillah + subtitle text and duration
- **ending** — closing du'a and duration
- **verses** — array of `{ arabic, translation, startFrame, endFrame }`

Each verse's `startFrame`/`endFrame` place it on the master timeline; the
subtitle components handle the rest.

## Structure

```
src/
  index.ts               registerRoot
  Root.tsx               <Composition> (reads composition size/fps from JSON)
  QuranShort.tsx         assembles all layers
  config/
    quran.config.json    the single source of truth
    types.ts             config types
  lib/
    fonts.ts             @fontsource imports + gold palette
    animations.ts        reusable easing / reveal / float / Ken Burns math
  components/
    Background.tsx       Ken Burns + parallax + grade + bloom + fog + vignette
    Particles.tsx        floating dust motes (seeded, deterministic)
    VerseAnimation.tsx   reusable reveal wrapper (fade + rise + scale + blur + float)
    ArabicVerse.tsx      gold-gradient Arabic w/ glow, outline, shadow
    EnglishSubtitle.tsx  serif English w/ gold separator, ≤70% width
    Opening.tsx          Bismillah → "Qur'an Recitation"
    Ending.tsx           Surah name + verses → du'a
    AudioLayer.tsx       untouched recitation + quiet looping ambience
```

## Typography

- **Arabic** — Amiri (Qur'anic-grade). Large, centered, gold gradient
  (`#F7D774 → #C99A2E`), soft glow, thin dark outline, elegant shadow, generous
  line spacing. Swap in *Uthmanic Hafs* by adding a local `@font-face` and
  changing `FONT_ARABIC` in `src/lib/fonts.ts`.
- **English** — Cormorant Garamond (falls back to Playfair Display). White,
  centered, ≤70% width, small gold separator line, soft shadow.

Fonts are bundled locally via `@fontsource/*` — no network fetch at render time.

## Animation

`VerseAnimation` is the reusable premium reveal: fade-in, slight upward drift,
95 % → 100 % scale, blur-to-sharp, gentle continuous float, and an eased
fade-out — all with soft cubic-bezier easing, no harsh movement. Backgrounds add
a slow Ken Burns zoom with very subtle parallax.

## Audio

The recitation is never processed — it plays at full volume, offset to
`audio.recitationStartFrame`. The ambience bed loops underneath at
`audio.ambienceDb` (default −30 dB) so it never competes with the voice.

## Notes

- The included `ambience.mp3` in a demo is a **synthesized placeholder**
  (soft wind/river). Replace it with a real river + birds field recording.
- For maximum quality use `npm run render:hq` or add `--crf=12`.
