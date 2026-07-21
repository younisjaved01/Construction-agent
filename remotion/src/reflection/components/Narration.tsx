import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';

/**
 * Narration audio — the original AI English voice (translation + reflection +
 * closing), placed at its start frame. No third-party recitation or music.
 * When `file` is null (before you've run `npm run generate` with a TTS key),
 * the video renders silently.
 */
export const Narration: React.FC<{file: string | null; startFrame: number}> = ({
  file,
  startFrame,
}) => {
  if (!file) return null;
  return (
    <Sequence from={startFrame} name="Narration">
      <Audio src={staticFile(file)} />
    </Sequence>
  );
};
