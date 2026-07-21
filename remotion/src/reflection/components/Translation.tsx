import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {EASE_IN_OUT, EASE_OUT} from '../../lib/animations';
import {Section} from '../../config/reflection.types';
import {COLORS, FONTS, SAFE} from '../lib/theme';
import {wordState} from '../lib/timing';

/**
 * English translation beneath the Arabic — luxury serif, white, centered,
 * ≤70% width. The full line is shown; each word lights gold as it's narrated
 * (synced word highlighting), with a soft fade in/out for the section.
 */
export const Translation: React.FC<{section: Section; centerY?: number}> = ({
  section,
  centerY = 1120,
}) => {
  const frame = useCurrentFrame();
  const {startFrame, endFrame, words} = section;
  if (frame < startFrame - 2 || frame > endFrame + 24) return null;

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 22, endFrame, endFrame + 22],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT},
  );
  const rise = interpolate(frame, [startFrame, startFrame + 26], [16, 0], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: centerY,
          opacity,
          transform: `translateY(${rise}px)`,
          maxWidth: `${100 - (SAFE.side / 1080) * 200}%`,
          padding: `0 ${SAFE.side}px`,
          textAlign: 'center',
          fontFamily: FONTS.serif,
          fontWeight: 500,
          fontSize: 52,
          lineHeight: 1.4,
          letterSpacing: 0.4,
        }}
      >
        {words.map((w, i) => {
          const st = wordState(w, frame);
          const isCurrent = st === 'current';
          return (
            <span
              key={i}
              style={{
                color: st === 'future' ? 'rgba(245,242,233,0.45)' : COLORS.white,
                textShadow: isCurrent
                  ? `0 0 18px ${COLORS.glow}, 0 3px 12px rgba(0,0,0,0.6)`
                  : '0 3px 12px rgba(0,0,0,0.6)',
                transition: 'color 0.1s',
              }}
            >
              {w.word}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
