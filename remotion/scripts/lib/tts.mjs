// TTS adapters. Each returns { audio: Buffer|null, words: [{word, start, end}] }
// with times in SECONDS relative to the start of the spoken segment.
//
// - elevenlabs: real, uses the /with-timestamps endpoint so caption word timings
//   are exact. Needs ELEVENLABS_API_KEY (+ optional ELEVENLABS_VOICE_ID).
// - mock: offline estimator (no audio) so the whole pipeline runs without a key.
//
// Add openai/azure by implementing the same { audio, words } contract.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Estimate per-word timing from text — used by the mock provider. */
export function estimateWords(text, {wps = 2.6, gap = 0.06} = {}) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const words = [];
  let t = 0;
  for (const tok of tokens) {
    const dur = clamp(tok.replace(/[^\w']/g, '').length * 0.052, 0.16, 0.9);
    words.push({word: tok, start: t, end: t + dur});
    t += dur + gap;
  }
  return {words, duration: t};
}

export async function mockTTS(text) {
  const {words} = estimateWords(text);
  return {audio: null, words};
}

/** Group ElevenLabs character-level alignment into word timings. */
function wordsFromChars(text, chars, starts, ends) {
  const words = [];
  let cur = '';
  let startT = null;
  let endT = 0;
  const flush = () => {
    const w = cur.trim();
    if (w) words.push({word: w, start: startT ?? 0, end: endT});
    cur = '';
    startT = null;
  };
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === ' ' || c === '\n') {
      flush();
    } else {
      if (startT === null) startT = starts[i];
      endT = ends[i];
      cur += c;
    }
  }
  flush();
  return words;
}

export async function elevenLabsTTS(text, opts = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
  const voiceId =
    opts.voiceId || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
  const modelId = opts.modelId || 'eleven_multilingual_v2';

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {'xi-api-key': apiKey, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {stability: 0.5, similarity_boost: 0.75, style: 0.15},
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const audio = Buffer.from(data.audio_base64, 'base64');
  const a = data.alignment || data.normalized_alignment;
  const words = wordsFromChars(
    a.characters.join(''),
    a.characters,
    a.character_start_times_seconds,
    a.character_end_times_seconds,
  );
  return {audio, words};
}

export function getProvider(name) {
  switch ((name || 'mock').toLowerCase()) {
    case 'elevenlabs':
      return elevenLabsTTS;
    case 'mock':
      return mockTTS;
    default:
      throw new Error(
        `Unknown TTS provider "${name}". Use "elevenlabs" or "mock" ` +
          `(or add an adapter in scripts/lib/tts.mjs).`,
      );
  }
}
