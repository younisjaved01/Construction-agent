import {existsSync} from 'node:fs';
import {probeDuration, uriToPath} from './ffmpeg.js';

/** A resolved, timed scene ready to render. */
export interface TimelineScene {
  index: number;
  script: string;
  keyframePath: string;
  voicePath?: string;
  clipPath?: string;
  start: number; // seconds on the master timeline
  duration: number; // seconds
}

export interface Timeline {
  scenes: TimelineScene[];
  total: number;
  musicPath?: string;
}

/** The shape produced by the generation manifest (Milestone 3/4). */
export interface ManifestLike {
  scenes: {
    index: number;
    script: string;
    keyframe: {uri: string};
    clip?: {uri: string};
    voice?: {uri: string};
  }[];
  music?: {uri: string};
}

/**
 * Turn a project manifest into a timed timeline. Each scene's length is driven
 * by its narration duration (probed) so the visuals always match the voice;
 * scenes without narration fall back to `defaultDuration`.
 */
export async function buildTimeline(
  manifest: ManifestLike,
  opts: {defaultDuration?: number} = {},
): Promise<Timeline> {
  const fallback = opts.defaultDuration ?? 4;
  const scenes: TimelineScene[] = [];
  let cursor = 0;

  for (const s of manifest.scenes) {
    const keyframePath = uriToPath(s.keyframe.uri);
    if (!existsSync(keyframePath)) {
      throw new Error(`Scene ${s.index}: keyframe not found at ${keyframePath}`);
    }
    const voicePath = s.voice ? uriToPath(s.voice.uri) : undefined;
    const duration =
      voicePath && existsSync(voicePath) ? Math.max(await probeDuration(voicePath), 1) : fallback;

    scenes.push({
      index: s.index,
      script: s.script,
      keyframePath,
      voicePath: voicePath && existsSync(voicePath) ? voicePath : undefined,
      clipPath: s.clip ? uriToPath(s.clip.uri) : undefined,
      start: cursor,
      duration,
    });
    cursor += duration;
  }

  const musicPath = manifest.music ? uriToPath(manifest.music.uri) : undefined;
  return {
    scenes,
    total: cursor,
    musicPath: musicPath && existsSync(musicPath) ? musicPath : undefined,
  };
}
