import React from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {EASE_IN_OUT, EASE_OUT, floating} from '../../lib/animations';
import {COLORS, FONTS} from '../lib/theme';

/**
 * 2-second cinematic intro over the landscape: soft light, the title
 * "Today's Quran Reflection", then a gentle fade into the verse.
 */
export const Intro: React.FC<{durationInFrames: number; title: string}> = ({
  durationInFrames,
  title,
}) => {
  return (
    <Sequence durationInFrames={durationInFrames} name="Intro">
      <IntroInner durationInFrames={durationInFrames} title={title} />
    </Sequence>
  );
};

const IntroInner: React.FC<{durationInFrames: number; title: string}> = ({
  durationInFrames: d,
  title,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 22, d - 26, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });
  const rise = interpolate(frame, [0, 30], [18, 0], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const blur = interpolate(frame, [0, 30], [8, 0], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const float = floating(frame, 4);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity}}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${rise + float}px)`,
          filter: `blur(${blur}px)`,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: `1.5px solid ${COLORS.gold}`,
            boxShadow: `0 0 26px ${COLORS.glow}`,
            marginBottom: 34,
            opacity: 0.9,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.serif,
            fontWeight: 600,
            fontSize: 62,
            letterSpacing: 1,
            color: COLORS.white,
            textShadow: '0 4px 18px rgba(0,0,0,0.7)',
            textAlign: 'center',
          }}
        >
          {title}
        </span>
        <div
          style={{
            width: 120,
            height: 2,
            marginTop: 26,
            background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
