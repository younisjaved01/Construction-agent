import {z} from 'zod';
import type {QualityTier} from '../core/types.js';
import {generate, type PipelineDeps} from '../pipeline/generate.js';

export const StorySchema = z.object({
  title: z.string().min(1),
  niche: z.string().default('general'),
  hook: z.string().default(''),
  scenes: z.array(z.object({index: z.number().int(), script: z.string().min(1)})).min(1),
  cta: z.string().optional(),
});
export type Story = z.infer<typeof StorySchema>;

const SYSTEM =
  'You are an expert short-form (YouTube Shorts / TikTok / Reels) scriptwriter. ' +
  'You write tight, emotionally engaging, faceless narration. Output STRICT JSON only.';

function buildStoryPrompt(o: {topic: string; niche?: string; sceneCount: number}): string {
  return (
    `Write a ${o.sceneCount}-scene faceless short-form video script about: "${o.topic}".` +
    (o.niche ? ` Niche/style: ${o.niche}.` : '') +
    ` Strong hook in scene 1. Each scene's "script" is 1-2 sentences of spoken narration.` +
    ` Return ONLY this JSON (no markdown):` +
    ` {"title":string,"niche":string,"hook":string,` +
    `"scenes":[{"index":number,"script":string}],"cta":string}`
  );
}

/** Pull the first JSON object out of an LLM response (tolerates ```json fences). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('No JSON object found in LLM output');
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Generate a validated, structured story. Routed through the same cost-optimized
 * pipeline as everything else, so an identical topic returns a cached story at $0.
 */
export async function generateStory(
  opts: {topic: string; niche?: string; sceneCount?: number; tier?: QualityTier},
  deps: PipelineDeps,
): Promise<Story> {
  const sceneCount = opts.sceneCount ?? 4;
  const prompt = buildStoryPrompt({topic: opts.topic, niche: opts.niche, sceneCount});
  const res = await generate(
    {modality: 'text', prompt, tier: opts.tier ?? 'standard', params: {system: SYSTEM, topic: opts.topic}},
    deps,
  );
  const bytes = await deps.store.readBytes(res.asset.hash);
  if (!bytes) throw new Error('Story asset missing from store');
  return StorySchema.parse(extractJson(new TextDecoder().decode(bytes)));
}
