import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Floating dust motes — slow upward drift with a gentle horizontal sway and a
 * soft opacity shimmer. Deterministic (seeded) so every render matches.
 */
export const Particles: React.FC<{count: number; opacity: number}> = ({
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
        size: 1.2 + random(`s-${i}`) * 3.2,
        speed: 5 + random(`v-${i}`) * 14, // px/sec upward
        sway: 10 + random(`w-${i}`) * 30,
        phase: random(`p-${i}`) * Math.PI * 2,
        baseOpacity: 0.25 + random(`o-${i}`) * 0.75,
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
        const shimmer = 0.6 + 0.4 * Math.sin(frame / 30 + m.phase);
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
              background: 'rgba(255,247,225,0.9)',
              opacity: m.baseOpacity * opacity * shimmer,
              filter: 'blur(1px)',
              boxShadow: '0 0 6px rgba(255,240,205,0.7)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
