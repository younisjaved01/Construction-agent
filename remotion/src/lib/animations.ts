// Pure, reusable cinematic animation helpers. No React hooks here — callers
// pass the current frame in, so these stay easy to test and compose.
import {Easing, interpolate} from 'remotion';

// Slow, luxurious ease-out (expo-ish) and a symmetric ease-in-out.
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);

export const dbToLinear = (db: number): number => Math.pow(10, db / 20);

export interface RevealStyle {
  opacity: number;
  translateY: number;
  scale: number;
  blur: number;
}

/**
 * The core "premium reveal": fade in with a slight upward drift, a 95% → 100%
 * scale and a blur-to-sharp transition, then a gentle fade out. Everything eased.
 */
export const reveal = (opts: {
  frame: number;
  start: number;
  end: number;
  enter?: number;
  exit?: number;
}): RevealStyle => {
  const {frame, start, end, enter = 28, exit = 26} = opts;
  const inP = interpolate(frame, [start, start + enter], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const outP = interpolate(frame, [end - exit, end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });
  return {
    opacity: Math.min(inP, outP),
    translateY: interpolate(inP, [0, 1], [26, 0]),
    scale: interpolate(inP, [0, 1], [0.95, 1]),
    blur: interpolate(inP, [0, 1], [12, 0]),
  };
};

/** Gentle, continuous floating (never harsh) — a slow vertical sine. */
export const floating = (
  frame: number,
  amplitude = 6,
  periodFrames = 260,
  phase = 0,
): number => Math.sin((frame / periodFrames) * Math.PI * 2 + phase) * amplitude;

/** Ken Burns zoom factor for a photo, based on its elapsed screen time. */
export const kenBurnsScale = (
  localFrame: number,
  durationFrames: number,
  zoom: number,
): number => 1 + zoom * (localFrame / Math.max(1, durationFrames));
