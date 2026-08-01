import {mkdtemp, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {log} from '../core/logger.js';
import {buildCaptions} from './captions.js';
import {ffmpeg} from './ffmpeg.js';
import type {Timeline, TimelineScene} from './timeline.js';

export interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  musicVolume?: number; // 0..1, ducked under narration
  crf?: number;
}

/** Pluggable renderer contract — a RemotionRenderer can implement the same. */
export interface Renderer {
  render(timeline: Timeline, outPath: string, opts?: RenderOptions): Promise<void>;
}

/**
 * FFmpeg editor. Assembles a timeline into a finished vertical MP4:
 *   per-scene Ken Burns on the keyframe → concat → burn captions →
 *   narration + ducked music. No CapCut, no browser, cheapest to run.
 */
export class FfmpegRenderer implements Renderer {
  async render(timeline: Timeline, outPath: string, opts: RenderOptions = {}): Promise<void> {
    const W = opts.width ?? 1080;
    const H = opts.height ?? 1920;
    const fps = opts.fps ?? 30;
    const work = await mkdtemp(join(tmpdir(), 'avf-edit-'));
    await mkdir(dirname(outPath), {recursive: true});

    // 1) per-scene Ken Burns visual (silent)
    const sceneFiles: string[] = [];
    for (const s of timeline.scenes) {
      const out = join(work, `scene_${s.index}.mp4`);
      await this.renderSceneVisual(s, out, {W, H, fps, crf: opts.crf ?? 20});
      sceneFiles.push(out);
    }

    // 2) concat visuals
    const concatList = join(work, 'concat.txt');
    await writeFile(concatList, sceneFiles.map((f) => `file '${f}'`).join('\n'));
    const visual = join(work, 'visual.mp4');
    await ffmpeg(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', visual]);

    // 3) narration track (voice per scene, silence where missing)
    const narration = await this.buildNarration(timeline, work);

    // 4) mix ducked music under narration
    const audio = await this.buildAudio(narration, timeline.musicPath, timeline.total, work, opts.musicVolume ?? 0.18);

    // 5) captions + final mux
    const ass = join(work, 'captions.ass');
    await writeFile(ass, buildCaptions(timeline.scenes, W, H));
    await ffmpeg([
      '-i', visual,
      '-i', audio,
      '-vf', `subtitles=${ass}`,
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(opts.crf ?? 20),
      '-pix_fmt', 'yuv420p', '-r', String(fps),
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      '-t', String(timeline.total),
      outPath,
    ]);
    log.info('render.done', {out: outPath, scenes: timeline.scenes.length, seconds: timeline.total});
  }

  private async renderSceneVisual(
    s: TimelineScene,
    out: string,
    {W, H, fps, crf}: {W: number; H: number; fps: number; crf: number},
  ): Promise<void> {
    const frames = Math.max(1, Math.round(s.duration * fps));
    // zoompan generates exactly `frames` frames from the single still — its `d`
    // controls the length, so NO -loop/-t (which would feed infinite frames).
    // 1.5x pre-scale keeps the slow zoom smooth (no pixel jitter).
    const vf =
      `scale=${W * 1.5}:${H * 1.5}:force_original_aspect_ratio=increase,` +
      `crop=${W * 1.5}:${H * 1.5},` +
      `zoompan=z='min(zoom+0.0009,1.16)':d=${frames}:` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${fps},` +
      `format=yuv420p`;
    await ffmpeg([
      '-i', s.keyframePath,
      '-vf', vf, '-frames:v', String(frames), '-an',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
      out,
    ]);
  }

  private async buildNarration(timeline: Timeline, work: string): Promise<string> {
    const parts: string[] = [];
    for (const s of timeline.scenes) {
      const p = join(work, `aud_${s.index}.wav`);
      if (s.voicePath) {
        // normalize each voice clip to the scene duration (pad/trim) at 48k stereo
        await ffmpeg([
          '-i', s.voicePath,
          '-af', `apad,atrim=0:${s.duration},aresample=48000`,
          '-ac', '2', p,
        ]);
      } else {
        await ffmpeg(['-f', 'lavfi', '-t', String(s.duration), '-i', 'anullsrc=r=48000:cl=stereo', p]);
      }
      parts.push(p);
    }
    const list = join(work, 'narr.txt');
    await writeFile(list, parts.map((f) => `file '${f}'`).join('\n'));
    const out = join(work, 'narration.wav');
    await ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, out]);
    return out;
  }

  private async buildAudio(
    narration: string,
    musicPath: string | undefined,
    total: number,
    work: string,
    musicVolume: number,
  ): Promise<string> {
    const out = join(work, 'audio.m4a');
    if (!musicPath) {
      await ffmpeg(['-i', narration, '-c:a', 'aac', '-b:a', '192k', out]);
      return out;
    }
    await ffmpeg([
      '-i', narration,
      '-stream_loop', '-1', '-i', musicPath,
      '-filter_complex',
      `[1:a]volume=${musicVolume}[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]`,
      '-map', '[a]', '-t', String(total), '-c:a', 'aac', '-b:a', '192k', out,
    ]);
    return out;
  }
}
