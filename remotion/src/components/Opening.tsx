import React from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {EASE_IN_OUT, EASE_OUT, floating} from '../lib/animations';
import {FONT_ARABIC, FONT_DISPLAY, GOLD_1, GOLD_GRADIENT, IVORY} from '../lib/fonts';

interface OpeningProps {
  startFrame: number;
  durationInFrames: number;
  bismillah: string;
  subtitle: string;
}

/** Opening card: Bismillah, then "Qur'an Recitation", both with soft fades. */
export const Opening: React.FC<OpeningProps> = (props) => {
  return (
    <Sequence
      from={props.startFrame}
      durationInFrames={props.durationInFrames}
      name="Opening"
    >
      <OpeningInner {...props} />
    </Sequence>
  );
};

const OpeningInner: React.FC<OpeningProps> = ({
  durationInFrames: d,
  bismillah,
  subtitle,
}) => {
  const frame = useCurrentFrame();

  const groupOpacity = interpolate(
    frame,
    [0, 30, d - 40, d],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT},
  );
  const bScale = interpolate(frame, [0, 42], [0.96, 1], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const bBlur = interpolate(frame, [0, 42], [10, 0], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const subOpacity = interpolate(frame, [48, 84], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const subRise = interpolate(frame, [48, 84], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const float = floating(frame, 5);

  return (
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', opacity: groupOpacity}}
    >
      <div
        style={{
          transform: `translateY(${float}px) scale(${bScale})`,
          filter: `blur(${bBlur}px)`,
          textAlign: 'center',
          direction: 'rtl',
          maxWidth: '88%',
        }}
      >
        <span
          style={{
            fontFamily: FONT_ARABIC,
            fontSize: 80,
            lineHeight: 1.8,
            backgroundImage: GOLD_GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
          }}
        >
          {bismillah}
        </span>
      </div>

      <div
        style={{
          marginTop: 56,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: subOpacity,
          transform: `translateY(${subRise}px)`,
        }}
      >
        <div
          style={{
            width: 90,
            height: 2,
            marginBottom: 22,
            background: `linear-gradient(90deg, transparent, ${GOLD_1}, transparent)`,
          }}
        />
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 36,
            letterSpacing: 6,
            color: IVORY,
            textTransform: 'uppercase',
            textShadow: '0 3px 12px rgba(0,0,0,0.6)',
          }}
        >
          {subtitle}
        </span>
      </div>
    </AbsoluteFill>
  );
};
