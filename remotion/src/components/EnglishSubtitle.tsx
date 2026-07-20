import React from 'react';
import {FONT_ENGLISH, GOLD_1, IVORY} from '../lib/fonts';

/**
 * Elegant English translation: a small gold separator line, then white serif
 * text, centered, capped at ~70% width with a soft shadow.
 */
export const EnglishSubtitle: React.FC<{
  text: string;
  fontSize?: number;
  maxWidthPercent?: number;
}> = ({text, fontSize = 39, maxWidthPercent = 70}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 46,
        maxWidth: `${maxWidthPercent}%`,
      }}
    >
      {/* gold separator */}
      <div
        style={{
          width: 72,
          height: 2,
          marginBottom: 26,
          borderRadius: 2,
          background: `linear-gradient(90deg, rgba(201,154,46,0) 0%, ${GOLD_1} 50%, rgba(201,154,46,0) 100%)`,
          boxShadow: '0 0 10px rgba(247,215,116,0.5)',
        }}
      />
      <div
        style={{
          fontFamily: FONT_ENGLISH,
          fontWeight: 500,
          fontSize,
          color: IVORY,
          textAlign: 'center',
          lineHeight: 1.5,
          letterSpacing: 0.3,
          textShadow: '0 3px 12px rgba(0,0,0,0.6)',
        }}
      >
        {text}
      </div>
    </div>
  );
};
