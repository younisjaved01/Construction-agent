import {describe, it, expect, beforeAll} from 'vitest';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAssetStore} from '../src/cache/assetStore.js';
import {ProviderRegistry} from '../src/providers/registry.js';
import {CostRouter} from '../src/providers/router.js';
import {generateStory} from '../src/content/story.js';
import {buildScenePrompts} from '../src/content/prompts.js';
import {CharacterManager, createCharacterRepo} from '../src/content/characters.js';

const deps = () => {
  const registry = ProviderRegistry.fromFile('config/providers.yaml');
  process.env.ASSET_LOCAL_DIR = join(tmpdir(), `avf-${randomUUID()}`);
  return {registry, router: new CostRouter(registry), store: createAssetStore()};
};

describe('Story generator (mock LLM)', () => {
  it('produces a validated multi-scene story', async () => {
    const story = await generateStory({topic: 'gratitude', sceneCount: 3}, deps());
    expect(story.title).toBeTruthy();
    expect(story.scenes.length).toBeGreaterThanOrEqual(1);
    expect(story.scenes[0]!.script).toBeTruthy();
  });
});

describe('Prompt generator', () => {
  it('injects the character and is model-family aware', async () => {
    const story = await generateStory({topic: 'the ocean'}, deps());
    const prompts = buildScenePrompts(story, {
      imageModel: 'fal-ai/flux/dev',
      videoModel: 'fal-ai/bytedance/seedance',
      character: {id: '1', name: 'Ayaan', description: 'a small white rabbit', createdAt: ''},
    });
    expect(prompts[0]!.imagePrompt).toContain('Ayaan');
    expect(prompts[0]!.imagePrompt).toContain('photorealistic'); // flux family token
    expect(prompts[0]!.motionPrompt).toContain('push-in'); // seedance family token
  });
});

describe('Character manager', () => {
  it('never regenerates an existing character', async () => {
    process.env.CHARACTER_DB = join(tmpdir(), `chars-${randomUUID()}.json`);
    const mgr = new CharacterManager(createCharacterRepo());
    const first = await mgr.getOrCreate({name: 'Ayaan', description: 'white rabbit'});
    const second = await mgr.getOrCreate({name: 'Ayaan', description: 'DIFFERENT desc'});
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.character.description).toBe('white rabbit'); // original preserved
  });
});
