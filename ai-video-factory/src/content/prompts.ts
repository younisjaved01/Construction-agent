import type {Character} from './characters.js';
import type {Story} from './story.js';

/** Optimized prompts for one scene, tuned to the target models. */
export interface ScenePrompts {
  index: number;
  script: string;
  imagePrompt: string;
  motionPrompt: string;
}

type ModelFamily = 'flux' | 'sdxl' | 'nano-banana' | 'seedance' | 'kling' | 'generic';

// Per-family style tokens — this is where model-specific prompt-engineering lives.
const IMAGE_STYLE: Record<ModelFamily, string> = {
  flux: 'ultra-detailed, photorealistic, cinematic lighting, shallow depth of field',
  sdxl: 'highly detailed, cinematic, volumetric light, sharp focus',
  'nano-banana': 'clean, consistent character, cinematic, soft light',
  generic: 'cinematic, high detail, dramatic lighting',
  seedance: 'cinematic still frame, high detail',
  kling: 'cinematic still frame, high detail',
};
const MOTION_STYLE: Record<ModelFamily, string> = {
  seedance: 'subtle natural motion, slow cinematic push-in, no sudden movements',
  kling: 'smooth cinematic camera move, gentle parallax, shallow depth of field',
  generic: 'slow cinematic camera move, gentle motion',
  flux: 'slow cinematic camera move, gentle motion',
  sdxl: 'slow cinematic camera move, gentle motion',
  'nano-banana': 'slow cinematic camera move, gentle motion',
};

/** Infer the model family from a provider model string. */
export function familyOf(model: string | undefined): ModelFamily {
  const m = (model ?? '').toLowerCase();
  if (m.includes('flux')) return 'flux';
  if (m.includes('sdxl')) return 'sdxl';
  if (m.includes('nano-banana')) return 'nano-banana';
  if (m.includes('seedance')) return 'seedance';
  if (m.includes('kling')) return 'kling';
  return 'generic';
}

/**
 * Turn story scenes into optimized image + motion prompts. Deterministic and
 * FREE (no LLM call) — model-specific style tokens plus the locked character
 * description are woven in so every keyframe stays on-model and on-character.
 */
export function buildScenePrompts(
  story: Story,
  opts: {imageModel?: string; videoModel?: string; character?: Character; aspect?: string} = {},
): ScenePrompts[] {
  const imgFam = familyOf(opts.imageModel);
  const vidFam = familyOf(opts.videoModel);
  const aspect = opts.aspect ?? '9:16 vertical';
  const charPrefix = opts.character
    ? `${opts.character.name} (${opts.character.description}${opts.character.style ? `, ${opts.character.style}` : ''}), keep identity identical. `
    : '';

  return story.scenes.map((s) => ({
    index: s.index,
    script: s.script,
    imagePrompt: `${charPrefix}${s.script} — ${IMAGE_STYLE[imgFam]}, ${aspect}`.trim(),
    motionPrompt: `${MOTION_STYLE[vidFam]}. ${s.script}`.trim(),
  }));
}
