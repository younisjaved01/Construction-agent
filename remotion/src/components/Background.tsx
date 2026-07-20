import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {BackgroundConfig} from '../config/types';
import {EASE_IN_OUT, kenBurnsScale} from '../lib/animations';

/**
 * Cinematic background: Ken Burns zoom + subtle parallax on each photo, joined
 * by crossfades, then warm grade, bloom highlights, drifting fog and a soft
 * vignette. All strengths come from config so the mood stays configurable.
 */
export const Background: React.FC<{
  config: BackgroundConfig;
  totalFrames: number;
}> = ({config, totalFrames}) => {
  const frame = useCurrentFrame();
  const {sources, crossfadeFrames, kenBurnsZoom, grade} = config;
  const n = Math.max(1, sources.length);
  // Per-photo screen time so the crossfades overlap and cover totalFrames.
  const seg = (totalFrames + (n - 1) * crossfadeFrames) / n;
  const gradeFilter = `saturate(${grade.saturation}) contrast(${grade.contrast}) brightness(${grade.brightness})`;

  return (
    <AbsoluteFill style={{backgroundColor: '#05060a'}}>
      {sources.map((src, i) => {
        const start = i * (seg - crossfadeFrames);
        const end = start + seg;
        if (frame < start - 2 || frame > end + 2) return null;
        const local = frame - start;
        const opacity = interpolate(
          frame,
          [start, start + crossfadeFrames, end - crossfadeFrames, end],
          [i === 0 ? 1 : 0, 1, 1, i === n - 1 ? 1 : 0],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT},
        );
        const scale = kenBurnsScale(local, seg, kenBurnsZoom);
        const driftX = interpolate(local, [0, seg], [-14, 14]);
        const driftY = interpolate(local, [0, seg], [10, -10]);
        return (
          <AbsoluteFill key={i} style={{opacity}}>
            <Img
              src={staticFile(src)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${scale}) translate(${driftX}px, ${driftY}px)`,
                filter: gradeFilter,
              }}
            />
          </AbsoluteFill>
        );
      })}

      {/* warm cinematic wash */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(255,196,120,${grade.warmth * 0.5}) 0%, rgba(120,90,50,${grade.warmth * 0.32}) 100%)`,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* cinematic dark scrim (drops exposure so text reads) */}
      <AbsoluteFill
        style={{backgroundColor: `rgba(4,6,12,${grade.scrim})`, pointerEvents: 'none'}}
      />

      {/* bloom highlight */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 42% at 50% 34%, rgba(255,241,212,${grade.bloom}) 0%, rgba(255,241,212,0) 70%)`,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      <Fog opacity={grade.fog} frame={frame} />

      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(122% 82% at 50% 42%, rgba(0,0,0,0) 45%, rgba(0,0,0,${grade.vignette}) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

/** Two slow, blurred, screen-blended clouds that drift for a subtle fog feel. */
const Fog: React.FC<{opacity: number; frame: number}> = ({opacity, frame}) => {
  const x1 = Math.sin(frame / 300) * 40;
  const x2 = Math.cos(frame / 420) * 52;
  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 50% at ${50 + x1 / 10}% 72%, rgba(228,234,244,${opacity}) 0%, rgba(228,234,244,0) 60%)`,
          transform: `translateX(${x1}px)`,
          filter: 'blur(42px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 46% at ${46 + x2 / 10}% 28%, rgba(210,220,236,${opacity * 0.8}) 0%, rgba(210,220,236,0) 60%)`,
          transform: `translateX(${x2}px)`,
          filter: 'blur(52px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
