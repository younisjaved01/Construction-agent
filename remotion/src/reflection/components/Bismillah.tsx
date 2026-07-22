import React from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {EASE_IN_OUT, EASE_OUT, floating} from '../../lib/animations';
import {COLORS, FONTS, GOLD_GRADIENT} from '../lib/theme';

/**
 * Opening card (first ~3s): the Bismillah in gold Arabic calligraphy with a soft
 * glow, and its English line beneath. Gentle fade in, gentle fade out into the
 * verse.
 */
export const Bismillah: React.FC<{
  durationInFrames: number;
  arabic?: string;
  english?: string;
}> = ({
  durationInFrames,
  arabic = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  english = 'In the Name of Allah, the Most Gracious, the Most Merciful.',
}) => {
  return (
    <Sequence durationInFrames={durationInFrames} name="Bismillah">
      <BismillahInner durationInFrames={durationInFrames} arabic={arabic} english={english} />
    </Sequence>
  );
};

const BismillahInner: React.FC<{durationInFrames: number; arabic: string; english: string}> = ({
  durationInFrames: d,
  arabic,
  english,
}) => {
  const frame = useCurrentFrame();

  const group = interpolate(frame, [0, 34, d - 40, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });
  const scale = interpolate(frame, [0, 46], [0.965, 1], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const blur = interpolate(frame, [0, 46], [9, 0], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const subOpacity = interpolate(frame, [26, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const float = floating(frame, 4);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: group}}>
      <div
        style={{
          transform: `translateY(${float}px) scale(${scale})`,
          filter: `blur(${blur}px)`,
          textAlign: 'center',
          direction: 'rtl',
          maxWidth: '86%',
        }}
      >
        <span
          style={{
            fontFamily: FONTS.arabic,
            fontSize: 78,
            lineHeight: 1.85,
            backgroundImage: GOLD_GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 26px ${COLORS.glow}) drop-shadow(0 6px 16px rgba(0,0,0,0.55))`,
          }}
        >
          {arabic}
        </span>
      </div>
      <div
        style={{
          marginTop: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: subOpacity,
          maxWidth: '74%',
        }}
      >
        <div
          style={{
            width: 96,
            height: 2,
            marginBottom: 24,
            background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          }}
        />
        <span
          style={{
            fontFamily: FONTS.serif,
            fontWeight: 500,
            fontSize: 36,
            lineHeight: 1.45,
            color: COLORS.ivory,
            textAlign: 'center',
            letterSpacing: 0.4,
            textShadow: '0 3px 14px rgba(0,0,0,0.65)',
          }}
        >
          {english}
        </span>
      </div>
    </AbsoluteFill>
  );
};
