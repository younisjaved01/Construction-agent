import type {TimelineScene} from './timeline.js';

const t = (sec: number): string => {
  const cs = Math.round(sec * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
};

const escape = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\N').trim();

/**
 * Build an .ass subtitle for the whole timeline — one caption per scene, centered
 * in the lower third, with a fade. libass handles wrapping + shaping.
 */
export function buildCaptions(scenes: TimelineScene[], playResX = 1080, playResY = 1920): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,DejaVu Sans,58,&H00FFFFFF,&H00000000,&H64000000,1,0,1,3,2,2,120,120,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const lines = scenes.map(
    (s) =>
      `Dialogue: 0,${t(s.start)},${t(s.start + s.duration)},Cap,,0,0,0,,{\\fad(250,250)}${escape(s.script)}`,
  );
  return `${header}\n${lines.join('\n')}\n`;
}
