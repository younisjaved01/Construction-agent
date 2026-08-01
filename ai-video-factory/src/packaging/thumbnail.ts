import type {AssetRef, QualityTier} from '../core/types.js';
import {generate, estimate, type PipelineDeps} from '../pipeline/generate.js';

export interface ThumbnailOptions {
  title: string;
  subject?: string; // main visual focus; defaults to the title
  style?: string; // art direction, e.g. "cinematic, dramatic lighting"
  aspect?: 'vertical' | 'wide'; // 9:16 for Shorts/Reels, 16:9 for YouTube
  tier?: QualityTier;
  providerId?: string;
  reference?: string; // optional character/keyframe URI for identity consistency
}

export interface ThumbnailResult {
  asset: AssetRef;
  costUsd: number;
  prompt: string;
}

/** A bold, high-CTR thumbnail brief — deterministic and model-agnostic. */
export function buildThumbnailPrompt(o: ThumbnailOptions): string {
  const subject = (o.subject ?? o.title).trim();
  const frame =
    o.aspect === 'wide'
      ? '16:9 YouTube thumbnail, rule-of-thirds composition'
      : '9:16 vertical thumbnail for Shorts/Reels';
  return (
    `${frame}. Eye-catching, high click-through-rate cover image. ` +
    `Subject: ${subject}. ` +
    `${o.style ?? 'cinematic, dramatic rim lighting, vivid saturated colors, shallow depth of field'}. ` +
    `Bold clear focal point, strong contrast, negative space for a title overlay, ` +
    `no watermark, no on-image text.`
  );
}

/**
 * Generate a thumbnail through the cost-optimized image pipeline (cheapest
 * sufficient model, cached, budget-gated by the caller). Reuses a character
 * reference when supplied so the thumbnail matches the video's identity.
 */
export async function generateThumbnail(
  opts: ThumbnailOptions,
  deps: PipelineDeps,
): Promise<ThumbnailResult> {
  const prompt = buildThumbnailPrompt(opts);
  const req = {
    modality: 'image' as const,
    prompt,
    tier: opts.tier ?? 'standard',
    providerId: opts.providerId,
    references: opts.reference ? [opts.reference] : undefined,
  };
  const res = await generate(req, deps);
  return {asset: res.asset, costUsd: res.costUsd, prompt};
}

/** Worst-case cost of a thumbnail without generating it (for budgeting). */
export async function estimateThumbnail(
  opts: ThumbnailOptions,
  deps: PipelineDeps,
): Promise<number> {
  const {costUsd} = await estimate(
    {
      modality: 'image',
      prompt: buildThumbnailPrompt(opts),
      tier: opts.tier ?? 'standard',
      providerId: opts.providerId,
      references: opts.reference ? [opts.reference] : undefined,
    },
    deps,
  );
  return costUsd;
}
