import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {floating, reveal} from '../lib/animations';

/**
 * Reusable animation wrapper. Give it an on/off frame window and it applies the
 * full premium reveal (fade + upward drift + 95→100% scale + blur-to-sharp) plus
 * a gentle continuous float. Wrap any subtitle content in it.
 */
export const VerseAnimation: React.FC<{
  startFrame: number;
  endFrame: number;
  children: React.ReactNode;
  floatAmplitude?: number;
  enter?: number;
  exit?: number;
  style?: React.CSSProperties;
}> = ({startFrame, endFrame, children, floatAmplitude = 6, enter, exit, style}) => {
  const frame = useCurrentFrame();
  // Don't render outside the window (keeps the tree light).
  if (frame < startFrame - 2 || frame > endFrame + 2) return null;

  const {opacity, translateY, scale, blur} = reveal({
    frame,
    start: startFrame,
    end: endFrame,
    enter,
    exit,
  });
  const float = floating(frame, floatAmplitude);

  return (
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', ...style}}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY + float}px) scale(${scale})`,
          filter: `blur(${blur}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
