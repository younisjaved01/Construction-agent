import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Floating dust motes drifting slowly upward with a gentle sway and shimmer —
 * seeded so renders are deterministic. Adds luxurious depth without distraction.
 */
export const ParticleSystem: React.FC<{count: number; opacity: number}> = ({
  count,
  opacity,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();

  const motes = useMemo(
    () =>
      Array.from({length: count}).map((_, i) => ({
        x: random(`x-${i}`) * width,
        startY: random(`y-${i}`) * height,
        size: 1.2 + random(`s-${i}`) * 3.4,
        speed: 4 + random(`v-${i}`) * 13,
        sway: 12 + random(`w-${i}`) * 32,
        phase: random(`p-${i}`) * Math.PI * 2,
        baseOpacity: 0.22 + random(`o-${i}`) * 0.78,
      })),
    [count, width, height],
  );

  const span = height + 60;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {motes.map((m, i) => {
        const travel = (frame * m.speed) / 60;
        const y = (((m.startY - travel) % span) + span) % span - 30;
        const x = m.x + Math.sin(frame / 60 + m.phase) * m.sway;
        const shimmer = 0.6 + 0.4 * Math.sin(frame / 28 + m.phase);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: m.size,
              height: m.size,
              borderRadius: '50%',
              background: 'rgba(255,244,214,0.92)',
              opacity: m.baseOpacity * opacity * shimmer,
              filter: 'blur(1px)',
              boxShadow: '0 0 7px rgba(255,232,180,0.75)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
