import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ReflectionGrade} from '../../config/reflection.types';
import {EASE_IN_OUT} from '../../lib/animations';

/**
 * "Cinema drone" treatment of a single still: a slow eased push-in combined with
 * a gentle directional drift and a subtle perspective tilt (so it reads as a
 * moving camera, not a flat zoom), layered with warm grade, drifting haze/fog,
 * sweeping god-rays, lens bloom and a soft vignette for depth.
 *
 * NOTE: true per-element motion (flowing river, moving clouds) needs an AI
 * depth/segmentation pass — feed such a clip in via QuranShort/video sources.
 * This gives the most convincing living-photo achievable from one flat image.
 */
export const BackgroundAnimation: React.FC<{
  source: string;
  zoom: number;
  grade: ReflectionGrade;
  /** where the light comes from, 0..1 across the frame (valley sun = top-right) */
  sunX?: number;
}> = ({source, zoom, grade, sunX = 0.72}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = frame / durationInFrames; // 0..1 eased progress
  const eased = interpolate(p, [0, 1], [0, 1], {easing: EASE_IN_OUT});

  // Camera move: push in + descend slightly + a hair of parallax drift + tilt.
  const scale = 1.03 + (0.03 + zoom) * eased;
  const driftX = interpolate(eased, [0, 1], [-22, 22]);
  const driftY = interpolate(eased, [0, 1], [26, -18]); // gentle "descend"
  const tilt = interpolate(eased, [0, 1], [0.6, -0.6]); // deg, perspective sway
  const gradeFilter = `saturate(${grade.saturation}) contrast(${grade.contrast}) brightness(${grade.brightness})`;

  return (
    <AbsoluteFill style={{backgroundColor: '#0a0c10', perspective: 2000, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `rotateX(${tilt}deg)`, transformOrigin: '50% 40%'}}>
        <Img
          src={staticFile(source)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale}) translate(${driftX}px, ${driftY}px)`,
            willChange: 'transform',
          }}
        />
      </AbsoluteFill>

      {/* atmospheric depth haze (front) */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(210,220,235,${grade.fog * 0.6}) 0%, rgba(210,220,235,0) 34%)`,
          pointerEvents: 'none',
        }}
      />

      <AbsoluteFill style={{filter: gradeFilter, mixBlendMode: 'multiply', pointerEvents: 'none'}} />

      {/* warm morning wash */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(255,206,140,${grade.warmth * 0.5}) 0%, rgba(60,44,22,${grade.warmth * 0.34}) 100%)`,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* sweeping volumetric god-rays from the sun */}
      <GodRays strength={grade.lightRays} sunX={sunX} frame={frame} />

      {/* drifting fog band low in the valley */}
      <Fog opacity={grade.fog} frame={frame} />

      {/* lens bloom at the sun */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 26% at ${sunX * 100}% 22%, rgba(255,240,205,${grade.bloom + 0.06}) 0%, rgba(255,240,205,0) 68%)`,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      {/* dark scrim so text reads */}
      <AbsoluteFill
        style={{backgroundColor: `rgba(10,12,16,${grade.scrim})`, pointerEvents: 'none'}}
      />

      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 82% at 50% 44%, rgba(0,0,0,0) 46%, rgba(0,0,0,${grade.vignette}) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

const GodRays: React.FC<{strength: number; sunX: number; frame: number}> = ({strength, sunX, frame}) => {
  const sweep = Math.sin(frame / 300) * 5;
  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${200 + sweep}deg at ${sunX * 100}% -8%, rgba(255,238,200,0) 0deg, rgba(255,238,200,${strength}) 10deg, rgba(255,238,200,0) 24deg, rgba(255,238,200,0) 200deg)`,
        mixBlendMode: 'screen',
        filter: 'blur(16px)',
        pointerEvents: 'none',
      }}
    />
  );
};

const Fog: React.FC<{opacity: number; frame: number}> = ({opacity, frame}) => {
  const x = Math.sin(frame / 340) * 46;
  const x2 = Math.cos(frame / 460) * 40;
  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 34% at ${50 + x / 12}% 62%, rgba(228,234,244,${opacity}) 0%, rgba(228,234,244,0) 60%)`,
          transform: `translateX(${x}px)`,
          filter: 'blur(50px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 26% at ${46 + x2 / 12}% 70%, rgba(215,224,238,${opacity * 0.7}) 0%, rgba(215,224,238,0) 60%)`,
          transform: `translateX(${x2}px)`,
          filter: 'blur(58px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};
