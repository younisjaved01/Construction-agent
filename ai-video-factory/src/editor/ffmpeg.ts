import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const pexec = promisify(execFile);

/** Resolve an ffmpeg/ffprobe binary: system PATH first, then ffmpeg-static. */
async function bin(name: 'ffmpeg' | 'ffprobe'): Promise<string> {
  try {
    await pexec(name, ['-version']);
    return name;
  } catch {
    if (name === 'ffmpeg') {
      try {
        // Optional dependency — specifier kept non-literal so it isn't a hard
        // compile-time requirement.
        const spec = 'ffmpeg-static';
        const mod = (await import(spec)) as {default?: string};
        if (mod.default) return mod.default;
      } catch {
        /* not installed */
      }
    }
    throw new Error(`${name} not found. Install FFmpeg (or \`npm i ffmpeg-static\`).`);
  }
}

export async function ffmpeg(args: string[]): Promise<void> {
  const b = await bin('ffmpeg');
  await pexec(b, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {maxBuffer: 1 << 26});
}

export async function probeDuration(path: string): Promise<number> {
  const b = await bin('ffprobe');
  const {stdout} = await pexec(b, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path,
  ]);
  const d = Number(stdout.trim());
  return Number.isFinite(d) ? d : 0;
}

/** local://ABSPATH → ABSPATH (other schemes returned unchanged for now). */
export function uriToPath(uri: string): string {
  return uri.startsWith('local://') ? uri.slice('local://'.length) : uri;
}
