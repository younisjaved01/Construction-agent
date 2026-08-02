import {readFile} from 'node:fs/promises';
import type {GeneratedBytes, GenerateInput, ProviderAdapter, ProviderConfig} from '../types.js';

/**
 * fal.ai adapter — one adapter serves many models (Flux, Nano-Banana, Seedance,
 * Kling …) because fal exposes them all behind a uniform endpoint. The specific
 * model comes from provider config, so adding a fal-hosted model is a YAML edit.
 *
 * Pay-per-use, no subscription — ideal for the "start cheap" phase.
 */
class FalAdapter implements ProviderAdapter {
  readonly id: string;
  constructor(readonly config: ProviderConfig) {
    this.id = config.id;
  }

  estimateCost(input: GenerateInput): number {
    // Video pricing scales with duration when the model takes a `duration` param.
    const duration = Number(input.params.duration ?? 0);
    if (this.config.unit === 'clip' && duration > 0) {
      return this.config.cost_per_unit * (duration / 5); // priced per ~5s baseline
    }
    return this.config.cost_per_unit;
  }

  async generate(input: GenerateInput): Promise<GeneratedBytes> {
    const key = process.env.FAL_KEY;
    if (!key) throw new Error('FAL_KEY is not set (enable it in .env for fal providers).');

    // Image-to-video / image edits pass the first reference as image_url.
    // Local files are inlined as data URIs so fal can actually fetch them
    // (no public hosting needed); http(s)/data URIs pass through unchanged.
    const imageUrl = await toImageUrl(input.references?.[0]);
    const body: Record<string, unknown> = {
      prompt: input.prompt,
      ...this.config.params,
      ...input.params,
      ...(imageUrl ? {image_url: imageUrl} : {}),
    };

    const res = await fetch(`https://fal.run/${this.config.model}`, {
      method: 'POST',
      headers: {Authorization: `Key ${key}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`fal ${this.config.model} ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as FalResult;
    const url =
      data.images?.[0]?.url ?? data.image?.url ?? data.video?.url ?? data.audio?.url;
    if (!url) throw new Error(`fal ${this.config.model}: no output URL in response`);

    const fileRes = await fetch(url);
    if (!fileRes.ok) throw new Error(`fal asset download ${fileRes.status}`);
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    const contentType =
      fileRes.headers.get('content-type') ?? guessContentType(this.config.modality);
    return {bytes, contentType};
  }
}

/** Turn a reference URI into something fal can fetch: http(s)/data pass through;
 *  local files are read and inlined as a base64 data URI (no hosting required). */
async function toImageUrl(ref?: string): Promise<string | undefined> {
  if (!ref) return undefined;
  if (/^https?:\/\//.test(ref) || ref.startsWith('data:')) return ref;
  if (ref.startsWith('local://')) {
    const path = ref.slice('local://'.length);
    const buf = await readFile(path);
    return `data:${mimeFromPath(path)};base64,${buf.toString('base64')}`;
  }
  return undefined; // unknown scheme — skip rather than send something fal can't use
}

function mimeFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

interface FalFile {
  url: string;
}
interface FalResult {
  images?: FalFile[];
  image?: FalFile;
  video?: FalFile;
  audio?: FalFile;
}

function guessContentType(modality: string): string {
  switch (modality) {
    case 'video':
      return 'video/mp4';
    case 'voice':
    case 'music':
      return 'audio/mpeg';
    default:
      return 'image/png';
  }
}

export function create(config: ProviderConfig): ProviderAdapter {
  return new FalAdapter(config);
}
