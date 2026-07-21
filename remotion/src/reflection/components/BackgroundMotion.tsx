import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ReflectionGrade} from '../../config/reflection.types';
import {kenBurnsScale} from '../../lib/animations';

/**
 * Cinematic background: slow Ken Burns zoom + subtle parallax drift on the
 * supplied footage, warm colour grade, dark scrim, light rays, drifting fog and
 * a soft vignette for depth. Never competes with the Quranic content.
 */
export const BackgroundMotion: React.FC<{
  source: string;
  zoom: number;
  grade: ReflectionGrade;
}> = ({source, zoom, grade}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const scale = kenBurnsScale(frame, durationInFrames, zoom);
  const driftX = interpolate(frame, [0, durationInFrames], [-18, 18]);
  const driftY = interpolate(frame, [0, durationInFrames], [12, -12]);
  const gradeFilter = `saturate(${grade.saturation}) contrast(${grade.contrast}) brightness(${grade.brightness})`;

  return (
    <AbsoluteFill style={{backgroundColor: '#0c0d10'}}>
      <AbsoluteFill>
        <Img
          src={staticFile(source)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale}) translate(${driftX}px, ${driftY}px)`,
            filter: gradeFilter,
          }}
        />
      </AbsoluteFill>

      {/* warm grade wash */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(212,175,55,${grade.warmth * 0.4}) 0%, rgba(40,28,10,${grade.warmth * 0.35}) 100%)`,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* dark cinematic scrim */}
      <AbsoluteFill
        style={{backgroundColor: `rgba(12,13,16,${grade.scrim})`, pointerEvents: 'none'}}
      />

      {/* slow light rays from top */}
      <LightRays strength={grade.lightRays} frame={frame} />

      {/* bloom */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(58% 40% at 50% 30%, rgba(255,240,205,${grade.bloom}) 0%, rgba(255,240,205,0) 70%)`,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      <Fog opacity={grade.fog} frame={frame} />

      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 42%, rgba(0,0,0,0) 45%, rgba(0,0,0,${grade.vignette}) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

const LightRays: React.FC<{strength: number; frame: number}> = ({strength, frame}) => {
  const shift = Math.sin(frame / 340) * 4;
  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${205 + shift}deg at 62% -10%, rgba(255,240,205,0) 0deg, rgba(255,240,205,${strength}) 12deg, rgba(255,240,205,0) 26deg, rgba(255,240,205,0) 180deg)`,
        mixBlendMode: 'screen',
        filter: 'blur(14px)',
        pointerEvents: 'none',
      }}
    />
  );
};

const Fog: React.FC<{opacity: number; frame: number}> = ({opacity, frame}) => {
  const x = Math.sin(frame / 320) * 44;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(80% 50% at ${50 + x / 10}% 74%, rgba(226,232,242,${opacity}) 0%, rgba(226,232,242,0) 60%)`,
        transform: `translateX(${x}px)`,
        filter: 'blur(46px)',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};
