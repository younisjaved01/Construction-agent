import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {EASE_OUT} from '../../lib/animations';
import {CaptionWord} from '../../config/reflection.types';
import {COLORS, FONTS} from '../lib/theme';
import {activeChunkIndex, chunkWords, wordState} from '../lib/timing';

/**
 * Captions.ai-style animated captions: words arrive in short centered phrases,
 * the currently-spoken word pops (scale + gold + glow), spoken words stay solid
 * white, upcoming words sit dimmed. Auto line-breaks by phrase; stays centered
 * inside the Shorts safe area.
 */
export const CaptionAnimation: React.FC<{
  words: CaptionWord[];
  centerY: number;
  fontSize?: number;
  maxWords?: number;
  maxWidth?: number;
}> = ({words, centerY, fontSize = 60, maxWords = 4, maxWidth = 860}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const chunks = useMemo(() => chunkWords(words, maxWords), [words, maxWords]);
  const idx = activeChunkIndex(chunks, frame);
  if (idx < 0) return null;
  const chunk = chunks[idx];

  // phrase entrance: quick spring pop-in as it appears
  const appear = spring({
    frame: frame - chunk.startFrame,
    fps,
    config: {damping: 200, mass: 0.6},
    durationInFrames: 14,
  });
  const exit = interpolate(
    frame,
    [chunk.endFrame + 4, chunk.endFrame + 16],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const groupOpacity = Math.min(appear, exit);
  const groupY = interpolate(appear, [0, 1], [24, 0], {easing: EASE_OUT});

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: centerY,
          width: maxWidth,
          maxWidth: '86%',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.12em 0.28em',
          opacity: groupOpacity,
          transform: `translateY(${groupY}px)`,
          fontFamily: FONTS.sans,
          fontWeight: 700,
          fontSize,
          lineHeight: 1.22,
          textAlign: 'center',
        }}
      >
        {chunk.words.map((w, i) => {
          const st = wordState(w, frame);
          const current = st === 'current';
          const pop = current
            ? spring({
                frame: frame - w.startFrame,
                fps,
                config: {damping: 180, mass: 0.5},
                durationInFrames: 10,
              })
            : 0;
          const scale = 1 + pop * 0.12;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `scale(${scale})`,
                color: current
                  ? COLORS.gold
                  : st === 'past'
                    ? COLORS.white
                    : 'rgba(255,255,255,0.4)',
                textShadow: current
                  ? `0 0 22px ${COLORS.glow}, 0 4px 14px rgba(0,0,0,0.7)`
                  : '0 4px 14px rgba(0,0,0,0.7)',
                WebkitTextStroke: current ? '0.5px rgba(0,0,0,0.25)' : undefined,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
