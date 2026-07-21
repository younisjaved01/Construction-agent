import {CaptionWord} from '../../config/reflection.types';

export interface Chunk {
  words: CaptionWord[];
  startFrame: number;
  endFrame: number;
}

/**
 * Group words into short caption phrases (Captions.ai style): at most `maxWords`
 * per chunk, and always break when there's a longer silence between words.
 */
export const chunkWords = (
  words: CaptionWord[],
  maxWords = 4,
  maxGapFrames = 22,
): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: CaptionWord[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = words[i - 1];
    const gap = prev ? w.startFrame - prev.endFrame : 0;
    if (cur.length >= maxWords || (prev && gap > maxGapFrames)) {
      if (cur.length) chunks.push(toChunk(cur));
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) chunks.push(toChunk(cur));
  return chunks;
};

const toChunk = (words: CaptionWord[]): Chunk => ({
  words,
  startFrame: words[0].startFrame,
  endFrame: words[words.length - 1].endFrame,
});

export const activeChunkIndex = (chunks: Chunk[], frame: number): number => {
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const next = chunks[i + 1];
    const upper = next ? next.startFrame : c.endFrame + 30;
    if (frame >= c.startFrame - 8 && frame < upper) return i;
  }
  return -1;
};

export type WordState = 'past' | 'current' | 'future';

export const wordState = (w: CaptionWord, frame: number): WordState => {
  if (frame >= w.endFrame) return 'past';
  if (frame >= w.startFrame) return 'current';
  return 'future';
};
