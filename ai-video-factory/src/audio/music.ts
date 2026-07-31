import {readFileSync} from 'node:fs';
import yaml from 'js-yaml';
import {z} from 'zod';

const TrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  mood: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  uri: z.string(),
});
const LibrarySchema = z.object({
  music: z.array(TrackSchema).default([]),
  sfx: z.array(TrackSchema).default([]),
});
export type Track = z.infer<typeof TrackSchema>;

/**
 * Mood-tagged local audio library. Selection is FREE — the cheapest possible way
 * to score a video. A generative music provider can be added later as a fallback
 * for moods with no matching track.
 */
export class MusicLibrary {
  private constructor(
    private readonly music: Track[],
    private readonly sfx: Track[],
  ) {}

  static fromFile(path = 'config/music.yaml'): MusicLibrary {
    const parsed = LibrarySchema.parse(yaml.load(readFileSync(path, 'utf8')));
    return new MusicLibrary(parsed.music, parsed.sfx);
  }

  /** Best background track for a mood (falls back to a neutral/first track). */
  selectMusic(mood: string): Track | null {
    return this.pick(this.music, 'mood', mood);
  }

  /** Best ambient SFX for a tag. */
  selectSfx(tag: string): Track | null {
    return this.pick(this.sfx, 'tags', tag);
  }

  private pick(tracks: Track[], field: 'mood' | 'tags', want: string): Track | null {
    if (tracks.length === 0) return null;
    const w = want.toLowerCase();
    const hit = tracks.find((t) => (t[field] ?? []).some((m) => m.toLowerCase() === w));
    if (hit) return hit;
    const neutral = tracks.find((t) =>
      (t[field] ?? []).some((m) => ['neutral', 'general', 'ambient'].includes(m.toLowerCase())),
    );
    return neutral ?? tracks[0]!;
  }
}
