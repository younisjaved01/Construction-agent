import React from 'react';
import {Section} from '../../config/reflection.types';
import {CaptionAnimation} from './CaptionAnimation';

/**
 * The original reflection, delivered as Captions.ai-style animated captions in
 * the lower-center safe area and synced to the narration.
 */
export const Reflection: React.FC<{section: Section; centerY?: number}> = ({
  section,
  centerY = 1180,
}) => {
  return (
    <CaptionAnimation
      words={section.words}
      centerY={centerY}
      fontSize={58}
      maxWords={4}
    />
  );
};
