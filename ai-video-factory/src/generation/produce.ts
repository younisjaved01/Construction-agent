import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {AssetRef, QualityTier} from '../core/types.js';
import {log} from '../core/logger.js';
import {estimate, generate, type PipelineDeps} from '../pipeline/generate.js';
import {generateStory} from '../content/story.js';
import {buildScenePrompts} from '../content/prompts.js';
import {CharacterManager, createCharacterRepo, type Character} from '../content/characters.js';
import {BudgetGuard} from './budget.js';

export interface SceneOutput {
  index: number;
  script: string;
  imagePrompt: string;
  motionPrompt: string;
  keyframe: AssetRef;
  clip?: AssetRef;
  costUsd: number;
}

export interface ProduceResult {
  title: string;
  niche: string;
  character?: string;
  scenes: SceneOutput[];
  totalCostUsd: number;
  manifestPath: string;
}

export interface ProduceOptions {
  topic: string;
  niche?: string;
  sceneCount?: number;
  character?: {name: string; description: string; style?: string};
  imageTier?: QualityTier;
  videoTier?: QualityTier;
  imageProvider?: string;
  videoProvider?: string;
  makeVideo?: boolean;
  budgetUsd?: number;
}

/**
 * The full generation pass: story → prompts → per-scene keyframe → animated shot,
 * every step routed to the cheapest sufficient model, cached, and gated by a
 * budget guard. A character is generated ONCE, its reference locked, then reused
 * across all scenes for consistency.
 */
export async function produce(opts: ProduceOptions, deps: PipelineDeps): Promise<ProduceResult> {
  const guard = new BudgetGuard(opts.budgetUsd ?? Infinity);
  const imageTier = opts.imageTier ?? 'draft';
  const videoTier = opts.videoTier ?? 'standard';

  // 1) resolve target models up front so prompts are model-aware AND generation
  //    pins the same provider (prompt family == actual model).
  const imgAdapter = await deps.router.select('image', imageTier, {providerId: opts.imageProvider});
  const vidAdapter = opts.makeVideo
    ? await deps.router.select('video', videoTier, {providerId: opts.videoProvider})
    : undefined;

  // 2) character: reuse or create once, then lock a reference keyframe
  let character: Character | undefined;
  if (opts.character) {
    const mgr = new CharacterManager(createCharacterRepo());
    character = (await mgr.getOrCreate(opts.character)).character;
    if (!character.refAssetUri) {
      const req = {
        modality: 'image' as const,
        prompt: `Character reference sheet: ${character.description}${character.style ? `, ${character.style}` : ''}, full body, neutral pose, plain background`,
        tier: imageTier,
        providerId: imgAdapter.id,
      };
      guard.check((await estimate(req, deps)).costUsd);
      const ref = await generate(req, deps);
      guard.record(ref.costUsd);
      character = await mgr.attachReference(character.name, ref.asset.hash, ref.asset.uri);
      log.info('character.locked', {name: character.name, ref: ref.asset.uri});
    }
  }

  // 3) story + optimized prompts
  const story = await generateStory(
    {topic: opts.topic, niche: opts.niche, sceneCount: opts.sceneCount, tier: 'standard'},
    deps,
  );
  const prompts = buildScenePrompts(story, {
    imageModel: imgAdapter.config.model,
    videoModel: vidAdapter?.config.model,
    character,
  });
  const references = character?.refAssetUri ? [character.refAssetUri] : undefined;

  // 4) per-scene keyframe (+ optional shot)
  const scenes: SceneOutput[] = [];
  for (const p of prompts) {
    const imgReq = {
      modality: 'image' as const,
      prompt: p.imagePrompt,
      tier: imageTier,
      providerId: imgAdapter.id,
      references,
    };
    guard.check((await estimate(imgReq, deps)).costUsd);
    const img = await generate(imgReq, deps);
    guard.record(img.costUsd);

    let clip: AssetRef | undefined;
    let clipCost = 0;
    if (vidAdapter) {
      const vidReq = {
        modality: 'video' as const,
        prompt: p.motionPrompt,
        tier: videoTier,
        providerId: vidAdapter.id,
        references: [img.asset.uri], // keyframe → image-to-video
      };
      guard.check((await estimate(vidReq, deps)).costUsd);
      const vid = await generate(vidReq, deps);
      guard.record(vid.costUsd);
      clip = vid.asset;
      clipCost = vid.costUsd;
    }

    scenes.push({
      index: p.index,
      script: p.script,
      imagePrompt: p.imagePrompt,
      motionPrompt: p.motionPrompt,
      keyframe: img.asset,
      clip,
      costUsd: img.costUsd + clipCost,
    });
  }

  // 5) persist a manifest the editor (M5) will consume
  const slug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const dir = process.env.PROJECTS_DIR ?? './data/projects';
  await mkdir(dir, {recursive: true});
  const manifestPath = join(dir, `${slug || 'project'}.json`);
  const result: ProduceResult = {
    title: story.title,
    niche: story.niche,
    character: character?.name,
    scenes,
    totalCostUsd: guard.spent,
    manifestPath,
  };
  await writeFile(manifestPath, JSON.stringify({...result, story}, null, 2));
  return result;
}
