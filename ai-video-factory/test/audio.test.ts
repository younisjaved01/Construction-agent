import {describe, it, expect} from 'vitest';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {MusicLibrary} from '../src/audio/music.js';
import {VoiceManager} from '../src/audio/voice.js';
import {createAssetStore} from '../src/cache/assetStore.js';
import {ProviderRegistry} from '../src/providers/registry.js';
import {CostRouter} from '../src/providers/router.js';
import {produce} from '../src/generation/produce.js';

describe('MusicLibrary', () => {
  const lib = MusicLibrary.fromFile('config/music.yaml');
  it('matches by mood', () => {
    expect(lib.selectMusic('spiritual')?.id).toBe('calm-morning');
  });
  it('falls back to a neutral track for unknown moods', () => {
    expect(lib.selectMusic('zzz-nonsense')?.id).toBe('neutral-1');
  });
});

describe('VoiceManager', () => {
  it('reuses a voice profile (never re-clones)', async () => {
    process.env.VOICE_DB = join(tmpdir(), `voices-${randomUUID()}.json`);
    const vm = new VoiceManager();
    const a = await vm.getOrCreate('brand', {providerId: 'mock-voice', voiceId: 'v1'});
    const b = await vm.getOrCreate('brand', {providerId: 'mock-voice', voiceId: 'DIFFERENT'});
    expect(a.voiceId).toBe('v1');
    expect(b.voiceId).toBe('v1'); // original preserved
  });
});

describe('produce with audio', () => {
  it('adds a voice per scene and a music track', async () => {
    const registry = ProviderRegistry.fromFile('config/providers.yaml');
    process.env.ASSET_LOCAL_DIR = join(tmpdir(), `avf-${randomUUID()}`);
    process.env.PROJECTS_DIR = join(tmpdir(), `proj-${randomUUID()}`);
    process.env.CHARACTER_DB = join(tmpdir(), `chars-${randomUUID()}.json`);
    process.env.VOICE_DB = join(tmpdir(), `voices-${randomUUID()}.json`);
    const result = await produce(
      {topic: 'hope', sceneCount: 2, makeVoice: true, makeMusic: true, mood: 'uplifting', budgetUsd: 5},
      {registry, router: new CostRouter(registry), store: createAssetStore()},
    );
    expect(result.scenes[0]!.voice).toBeDefined();
    expect(result.music?.mood).toBe('uplifting');
  });
});
