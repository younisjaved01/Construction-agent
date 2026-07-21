import React from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {EASE_IN_OUT, EASE_OUT, floating} from '../../lib/animations';
import {COLORS, FONTS} from '../lib/theme';

/**
 * Closing call-to-reflection: "If this reminder benefited you, share it with
 * someone you love. May Allah reward you." Staggered lines, gentle fade out.
 */
export const Outro: React.FC<{
  startFrame: number;
  durationInFrames: number;
  lines: string[];
}> = ({startFrame, durationInFrames, lines}) => {
  return (
    <Sequence from={startFrame} durationInFrames={durationInFrames} name="Outro">
      <OutroInner durationInFrames={durationInFrames} lines={lines} />
    </Sequence>
  );
};

const OutroInner: React.FC<{durationInFrames: number; lines: string[]}> = ({
  durationInFrames: d,
  lines,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 26, d - 34, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });
  const float = floating(frame, 4);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity}}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${float}px)`,
          padding: '0 120px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 110,
            height: 2,
            marginBottom: 40,
            background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          }}
        />
        {lines.map((line, i) => {
          const start = 14 + i * 12;
          const lineOpacity = interpolate(frame, [start, start + 24], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EASE_OUT,
          });
          const rise = interpolate(frame, [start, start + 24], [14, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EASE_OUT,
          });
          const isLast = i === lines.length - 1;
          return (
            <span
              key={i}
              style={{
                fontFamily: FONTS.serif,
                fontWeight: isLast ? 600 : 500,
                fontStyle: isLast ? 'italic' : 'normal',
                fontSize: isLast ? 46 : 42,
                lineHeight: 1.5,
                marginTop: i === 0 ? 0 : 14,
                color: isLast ? COLORS.gold : COLORS.white,
                opacity: lineOpacity,
                transform: `translateY(${rise}px)`,
                textShadow: '0 3px 14px rgba(0,0,0,0.7)',
              }}
            >
              {line}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
