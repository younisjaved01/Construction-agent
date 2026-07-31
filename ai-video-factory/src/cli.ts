import {fileURLToPath} from 'node:url';
import {QUALITY_TIERS, type Modality, type QualityTier} from './core/types.js';
import {createAssetStore} from './cache/assetStore.js';
import {ProviderRegistry} from './providers/registry.js';
import {CostRouter} from './providers/router.js';
import {generate, type PipelineDeps} from './pipeline/generate.js';
import {generateStory} from './content/story.js';
import {buildScenePrompts} from './content/prompts.js';
import {CharacterManager, createCharacterRepo} from './content/characters.js';

const MODALITIES: Modality[] = ['text', 'image', 'video', 'voice', 'music'];

const flag = (args: string[], name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function buildDeps(rest: string[]): PipelineDeps {
  const registry = ProviderRegistry.fromFile(flag(rest, 'config') ?? 'config/providers.yaml');
  return {registry, router: new CostRouter(registry), store: createAssetStore()};
}

async function cmdGenerate(modality: Modality, prompt: string, rest: string[]): Promise<void> {
  const tier = (flag(rest, 'tier') ?? 'draft') as QualityTier;
  if (!QUALITY_TIERS.includes(tier)) throw new Error(`Unknown tier: ${tier}`);
  const result = await generate(
    {modality, prompt, tier, providerId: flag(rest, 'provider')},
    buildDeps(rest),
  );
  console.log(`\nprovider : ${result.providerId}`);
  console.log(`cache    : ${result.cacheHit ? 'HIT (reused, $0)' : 'MISS (generated)'}`);
  console.log(`cost     : $${result.costUsd.toFixed(4)}`);
  console.log(`uri      : ${result.asset.uri}\n`);
}

async function cmdStory(topic: string, rest: string[]): Promise<void> {
  const deps = buildDeps(rest);
  const characterName = flag(rest, 'character');
  const character = characterName
    ? (await new CharacterManager(createCharacterRepo()).getOrCreate({
        name: characterName,
        description: flag(rest, 'character-desc') ?? characterName,
      })).character
    : undefined;

  const story = await generateStory(
    {
      topic,
      niche: flag(rest, 'niche'),
      sceneCount: flag(rest, 'scenes') ? Number(flag(rest, 'scenes')) : undefined,
      tier: (flag(rest, 'tier') as QualityTier) ?? 'standard',
    },
    deps,
  );

  const prompts = buildScenePrompts(story, {
    imageModel: flag(rest, 'image-model'),
    videoModel: flag(rest, 'video-model'),
    character,
  });

  console.log(`\n🎬 ${story.title}   [niche: ${story.niche}]`);
  console.log(`hook: ${story.hook}\n`);
  for (const p of prompts) {
    console.log(`── Scene ${p.index} ─────────────────────────`);
    console.log(`  script : ${p.script}`);
    console.log(`  image  : ${p.imagePrompt}`);
    console.log(`  motion : ${p.motionPrompt}`);
  }
  if (story.cta) console.log(`\ncta: ${story.cta}`);
  console.log('');
}

async function cmdCharacter(rest: string[]): Promise<void> {
  const mgr = new CharacterManager(createCharacterRepo());
  const [action, name, description] = rest;
  if (action === 'add') {
    if (!name || !description) throw new Error('Usage: factory character add "<name>" "<description>"');
    const {character, created} = await mgr.getOrCreate({name, description, style: flag(rest, 'style')});
    console.log(created ? `created "${character.name}" (${character.id})` : `exists "${character.name}" — reused, not regenerated`);
  } else if (action === 'list') {
    for (const c of await mgr.list()) console.log(`- ${c.name}: ${c.description}${c.referenceHash ? ' [ref locked]' : ''}`);
  } else {
    throw new Error('Usage: factory character <add|list> ...');
  }
}

async function main(argv: string[]): Promise<void> {
  const [cmd, arg, ...rest] = argv;

  if (cmd && MODALITIES.includes(cmd as Modality)) {
    if (!arg) throw new Error('A prompt is required.');
    return cmdGenerate(cmd as Modality, arg, rest);
  }
  if (cmd === 'story') {
    if (!arg) throw new Error('A topic is required.');
    return cmdStory(arg, rest);
  }
  if (cmd === 'character') return cmdCharacter([arg, ...rest].filter(Boolean) as string[]);

  console.error(
    'Usage:\n' +
      '  factory <text|image|video|voice|music> "<prompt>" [--tier T] [--provider ID]\n' +
      '  factory story "<topic>" [--scenes N] [--niche X] [--tier T] [--character NAME] [--image-model M] [--video-model M]\n' +
      '  factory character add "<name>" "<description>" [--style S]\n' +
      '  factory character list',
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
