import React from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {EASE_IN_OUT, EASE_OUT, floating} from '../lib/animations';
import {QuranConfig} from '../config/types';
import {FONT_ARABIC, FONT_DISPLAY, FONT_ENGLISH, GOLD_1, GOLD_GRADIENT, IVORY} from '../lib/fonts';

interface EndingProps {
  startFrame: number;
  durationInFrames: number;
  surah: QuranConfig['surah'];
  dua: string;
}

/** Ending card: surah name + verse range, then the closing du'a — soft fades. */
export const Ending: React.FC<EndingProps> = (props) => {
  return (
    <Sequence
      from={props.startFrame}
      durationInFrames={props.durationInFrames}
      name="Ending"
    >
      <EndingInner {...props} />
    </Sequence>
  );
};

const EndingInner: React.FC<EndingProps> = ({durationInFrames: d, surah, dua}) => {
  const frame = useCurrentFrame();

  const groupOpacity = interpolate(frame, [0, 36, d - 44, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  });
  const rise = interpolate(frame, [0, 46], [18, 0], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const blur = interpolate(frame, [0, 46], [8, 0], {
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const duaOpacity = interpolate(frame, [70, 108], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  });
  const float = floating(frame, 4);

  return (
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', opacity: groupOpacity}}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${rise + float}px)`,
          filter: `blur(${blur}px)`,
        }}
      >
        <span
          style={{
            fontFamily: FONT_ARABIC,
            fontSize: 66,
            lineHeight: 1.6,
            backgroundImage: GOLD_GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))',
          }}
        >
          سورة {surah.nameArabic}
        </span>

        <div
          style={{
            width: 96,
            height: 2,
            margin: '30px 0 26px',
            background: `linear-gradient(90deg, transparent, ${GOLD_1}, transparent)`,
          }}
        />

        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 40,
            letterSpacing: 3,
            color: IVORY,
            textShadow: '0 3px 12px rgba(0,0,0,0.6)',
          }}
        >
          Surah {surah.name}
        </span>
        <span
          style={{
            fontFamily: FONT_ENGLISH,
            fontSize: 30,
            letterSpacing: 2,
            color: 'rgba(246,244,238,0.8)',
            marginTop: 10,
          }}
        >
          Verses {surah.verseRange}
        </span>
      </div>

      <span
        style={{
          position: 'absolute',
          bottom: 360,
          fontFamily: FONT_ENGLISH,
          fontStyle: 'italic',
          fontSize: 34,
          color: IVORY,
          opacity: duaOpacity,
          textShadow: '0 3px 12px rgba(0,0,0,0.6)',
        }}
      >
        {dua}
      </span>
    </AbsoluteFill>
  );
};
