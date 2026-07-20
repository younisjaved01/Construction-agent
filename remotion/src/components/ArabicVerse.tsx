import React from 'react';
import {FONT_ARABIC, GOLD_GRADIENT} from '../lib/fonts';

/**
 * Large centered Arabic verse: gold gradient fill, soft glow, thin dark outline,
 * elegant shadow and generous line spacing. Purely presentational — timing and
 * motion come from <VerseAnimation>.
 */
export const ArabicVerse: React.FC<{
  text: string;
  fontSize?: number;
}> = ({text, fontSize = 92}) => {
  return (
    <div
      style={{
        position: 'relative',
        maxWidth: '88%',
        textAlign: 'center',
        direction: 'rtl',
        fontFamily: FONT_ARABIC,
        fontWeight: 400,
        fontSize,
        lineHeight: 1.95,
      }}
    >
      {/* Glow + thin outline layer, sitting exactly behind the fill. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          color: 'transparent',
          WebkitTextStroke: '1.1px rgba(0,0,0,0.5)',
          textShadow:
            '0 0 22px rgba(247,215,116,0.45), 0 0 46px rgba(247,215,116,0.22)',
        }}
      >
        {text}
      </span>
      {/* Gold gradient fill with an elegant drop shadow. */}
      <span
        style={{
          position: 'relative',
          backgroundImage: GOLD_GRADIENT,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))',
        }}
      >
        {text}
      </span>
    </div>
  );
};
