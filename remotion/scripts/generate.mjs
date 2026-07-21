#!/usr/bin/env node
// Automated pipeline: brief.json -> narration audio + word-timed captions ->
// src/config/reflection.config.json. Then `npm run render` makes the Short.
//
//   NARRATION_PROVIDER=elevenlabs ELEVENLABS_API_KEY=... npm run generate
//   npm run generate            # offline mock (no audio, estimated timings)
//
// You only ever edit scripts/brief.json (verse, translation, background).

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {getProvider} from './lib/tts.mjs';
import {generateReflection} from './lib/reflect.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FPS = 60;
const f = (sec) => Math.round(sec * FPS);

// ---- timeline constants (seconds) ----
const INTRO = 2.0;
const PREROLL = 2.0; // "pause for 2 seconds" before the translation
const GAP_AFTER_TRANSLATION = 1.0;
const GAP_AFTER_REFLECTION = 0.9;
const TAIL = 0.9; // hold after the closing line
const OUTRO = 2.6;

async function main() {
  const brief = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'brief.json'), 'utf8'),
  );
  const providerName =
    process.env.NARRATION_PROVIDER || brief.narration?.provider || 'mock';
  const tts = getProvider(providerName);
  console.log(`provider: ${providerName}`);

  // 1) reflection — from brief, or auto-generated if empty + key present
  let reflectionText = (brief.reflection || '').trim();
  if (!reflectionText) {
    reflectionText =
      (await generateReflection({
        translation: brief.translation,
        reference: brief.verse.reference,
      })) || '';
    if (!reflectionText)
      throw new Error('No reflection in brief and no ANTHROPIC_API_KEY to generate one.');
  }

  // 2) synthesize each spoken segment
  const specs = [
    {key: 'translation', text: brief.translation},
    {key: 'reflection', text: reflectionText},
    {key: 'closing', text: (brief.closing || 'May Allah guide us all.').trim()},
  ];
  const opts = {voiceId: brief.narration?.voiceId, modelId: brief.narration?.modelId};
  const results = [];
  for (const s of specs) {
    const r = await tts(s.text, opts);
    results.push({...s, ...r});
    console.log(`  ${s.key}: ${r.words.length} words${r.audio ? ' + audio' : ' (mock)'}`);
  }

  // 3) lay out the master timeline
  const narrationStartFrame = f(INTRO);
  let cursor = PREROLL; // seconds within the narration track
  const gaps = [PREROLL]; // leading silence, then between-segment gaps
  const sections = {};
  const order = ['translation', 'reflection', 'closing'];
  const gapAfter = {
    translation: GAP_AFTER_TRANSLATION,
    reflection: GAP_AFTER_REFLECTION,
    closing: 0,
  };
  for (const key of order) {
    const seg = results.find((r) => r.key === key);
    const segDur = seg.words.length ? seg.words[seg.words.length - 1].end : 0;
    const baseFrame = narrationStartFrame + f(cursor);
    sections[key] = {
      text: seg.text,
      startFrame: baseFrame,
      endFrame: baseFrame + f(segDur),
      words: seg.words.map((w) => ({
        word: w.word,
        startFrame: narrationStartFrame + f(cursor + w.start),
        endFrame: narrationStartFrame + f(cursor + w.end),
      })),
    };
    cursor += segDur;
    if (gapAfter[key]) {
      gaps.push(gapAfter[key]);
      cursor += gapAfter[key];
    }
  }

  const outroStart = sections.closing.endFrame + f(TAIL);
  const durationInFrames = outroStart + f(OUTRO);

  // 4) assemble narration audio (only when we have real TTS audio)
  let narrationFile = null;
  const haveAudio = results.every((r) => r.audio);
  if (haveAudio) {
    narrationFile = await assembleAudio(results, gaps);
  } else {
    console.log('  (mock) no audio written — captions use estimated timings');
  }

  // 5) write the render config
  const config = {
    composition: {width: 1080, height: 1920, fps: FPS, durationInFrames},
    background: {
      source: brief.background,
      kenBurnsZoom: 0.12,
      grade: {
        warmth: 0.16,
        saturation: 1.06,
        contrast: 1.08,
        brightness: 0.78,
        scrim: 0.46,
        vignette: 0.72,
        bloom: 0.1,
        fog: 0.06,
        lightRays: 0.06,
      },
    },
    particles: {count: 46, opacity: 0.34},
    intro: {durationInFrames: f(INTRO), title: "Today's Quran Reflection"},
    verse: brief.verse,
    narration: {file: narrationFile, startFrame: narrationStartFrame, provider: providerName},
    translation: sections.translation,
    reflection: sections.reflection,
    closing: sections.closing,
    outro: {
      startFrame: outroStart,
      durationInFrames: f(OUTRO),
      lines: [
        'If this reminder benefited you,',
        'share it with someone you love.',
        'May Allah reward you.',
      ],
    },
  };

  const outPath = path.join(ROOT, 'src/config/reflection.config.json');
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`\nwrote ${path.relative(ROOT, outPath)}`);
  console.log(`duration: ${durationInFrames} frames (${(durationInFrames / FPS).toFixed(1)}s)`);
  console.log(narrationFile ? `narration: public/${narrationFile}` : 'narration: (none — add a TTS key)');
}

/** Concatenate [silence, seg, silence, seg, ...] into public/narration.mp3. */
async function assembleAudio(results, gaps) {
  // Prefer the bundled ffmpeg-static binary; fall back to a system ffmpeg.
  let ffmpegBin = 'ffmpeg';
  try {
    const m = await import('ffmpeg-static');
    if (m.default) ffmpegBin = m.default;
  } catch {
    /* not installed — fall back to system ffmpeg on PATH */
  }
  const tmp = path.join(ROOT, 'out', 'tts');
  fs.mkdirSync(tmp, {recursive: true});
  const inputs = [];
  const filter = [];
  let idx = 0;
  const push = (args) => {
    inputs.push(...args);
    return idx++;
  };
  const silence = (dur) =>
    push(['-f', 'lavfi', '-t', dur.toFixed(3), '-i', 'anullsrc=r=44100:cl=mono']);
  const order = ['translation', 'reflection', 'closing'];

  const seq = [];
  seq.push(silence(gaps[0])); // leading pause
  order.forEach((key, i) => {
    const seg = results.find((r) => r.key === key);
    const p = path.join(tmp, `${key}.mp3`);
    fs.writeFileSync(p, seg.audio);
    seq.push(push(['-i', p]));
    if (gaps[i + 1]) seq.push(silence(gaps[i + 1]));
  });
  const labels = seq.map((n) => `[${n}:a]`).join('');
  filter.push(`${labels}concat=n=${seq.length}:v=0:a=1,aresample=48000[a]`);

  const outFile = 'narration.mp3';
  execFileSync(
    ffmpegBin,
    ['-y', ...inputs, '-filter_complex', filter.join(';'), '-map', '[a]',
     '-c:a', 'libmp3lame', '-q:a', '2', path.join(ROOT, 'public', outFile)],
    {stdio: 'inherit'},
  );
  return outFile;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
