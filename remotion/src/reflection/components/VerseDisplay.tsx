import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {floating, reveal} from '../../lib/animations';
import {COLORS, FONTS, GOLD_GRADIENT} from '../lib/theme';

/**
 * The Arabic verse — the visual centerpiece. Gold gradient, soft glow, thin
 * shadow, elegant fade + slow upward reveal, gentle float. Sits in the upper
 * third so the translation/reflection can live below it.
 */
export const VerseDisplay: React.FC<{
  arabic: string;
  reference: string;
  startFrame: number;
  endFrame: number;
  fontSize?: number;
  centerY?: number;
}> = ({arabic, reference, startFrame, endFrame, fontSize = 92, centerY = 620}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame - 2) return null;

  const {opacity, translateY, scale, blur} = reveal({
    frame,
    start: startFrame,
    end: endFrame,
    enter: 34,
    exit: 30,
  });
  const float = floating(frame, 5);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: centerY,
          transform: `translateY(${translateY + float}px) scale(${scale})`,
          opacity,
          filter: `blur(${blur}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            position: 'relative',
            maxWidth: '86%',
            textAlign: 'center',
            direction: 'rtl',
            fontFamily: FONTS.arabic,
            fontSize,
            lineHeight: 1.9,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              color: 'transparent',
              WebkitTextStroke: '1px rgba(0,0,0,0.45)',
              textShadow: `0 0 26px ${COLORS.glow}, 0 0 54px rgba(212,175,55,0.25)`,
            }}
          >
            {arabic}
          </span>
          <span
            style={{
              position: 'relative',
              backgroundImage: GOLD_GRADIENT,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
            }}
          >
            {arabic}
          </span>
        </div>

        <div
          style={{
            marginTop: 26,
            fontFamily: FONTS.sans,
            fontWeight: 500,
            fontSize: 24,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(212,175,55,0.85)',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}
        >
          {reference}
        </div>
      </div>
    </AbsoluteFill>
  );
};
