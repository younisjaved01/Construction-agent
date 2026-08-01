import {z} from 'zod';
import type {QualityTier} from '../core/types.js';
import {generate, type PipelineDeps} from '../pipeline/generate.js';
import {extractJson, type Story} from '../content/story.js';

export const MetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  platforms: z
    .object({
      youtube: z.object({title: z.string(), description: z.string()}).partial().optional(),
      tiktok: z.object({caption: z.string()}).partial().optional(),
      instagram: z.object({caption: z.string()}).partial().optional(),
    })
    .default({}),
});
export type Metadata = z.infer<typeof MetadataSchema>;

const SYSTEM =
  'You are a growth-focused social copywriter for faceless short-form video. ' +
  'You write scroll-stopping titles, SEO descriptions and platform-native captions/hashtags. ' +
  'Output STRICT JSON only.';

function buildMetadataPrompt(story: Story): string {
  const beats = story.scenes.map((s) => `- ${s.script}`).join('\n');
  return (
    `Write publishing metadata for this faceless short (niche: ${story.niche}).\n` +
    `Title: ${story.title}\nHook: ${story.hook}\nScenes:\n${beats}\n\n` +
    `Return ONLY this JSON (no markdown): ` +
    `{"title":string,"description":string,"tags":[string],` +
    `"platforms":{"youtube":{"title":string,"description":string},` +
    `"tiktok":{"caption":string},"instagram":{"caption":string}}}. ` +
    `youtube.title must include "#Shorts". tiktok/instagram captions must include 3-6 hashtags.`
  );
}

/**
 * Generate validated, platform-ready publishing metadata from a story. Routed
 * through the same cost-optimized pipeline, so an identical story yields cached
 * metadata at $0. Consumed by the auto-poster (M7).
 */
export async function generateMetadata(
  story: Story,
  deps: PipelineDeps,
  tier: QualityTier = 'standard',
): Promise<Metadata> {
  const res = await generate(
    {
      modality: 'text',
      prompt: buildMetadataPrompt(story),
      tier,
      params: {system: SYSTEM, kind: 'metadata', title: story.title},
    },
    deps,
  );
  const bytes = await deps.store.readBytes(res.asset.hash);
  if (!bytes) throw new Error('Metadata asset missing from store');
  return MetadataSchema.parse(extractJson(new TextDecoder().decode(bytes)));
}
