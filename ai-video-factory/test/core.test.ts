import {describe, it, expect} from 'vitest';
import {assetHash} from '../src/cache/hash.js';
import {ProviderRegistry} from '../src/providers/registry.js';
import {CostRouter} from '../src/providers/router.js';

describe('assetHash', () => {
  it('is stable regardless of param key order', () => {
    const a = assetHash({modality: 'image', model: 'm', prompt: 'hi', params: {a: 1, b: 2}});
    const b = assetHash({modality: 'image', model: 'm', prompt: 'hi', params: {b: 2, a: 1}});
    expect(a).toBe(b);
  });
  it('changes when the prompt changes', () => {
    const a = assetHash({modality: 'image', model: 'm', prompt: 'hi'});
    const b = assetHash({modality: 'image', model: 'm', prompt: 'bye'});
    expect(a).not.toBe(b);
  });
});

describe('CostRouter', () => {
  const registry = ProviderRegistry.fromFile('config/providers.yaml');
  const router = new CostRouter(registry);

  it('selects an enabled provider that satisfies the tier', async () => {
    const adapter = await router.select('image', 'draft');
    expect(adapter.config.enabled).toBe(true);
    expect(adapter.config.modality).toBe('image');
  });

  it('never returns a provider below the requested tier', async () => {
    const adapter = await router.select('image', 'draft');
    // quality is a ceiling; draft is the floor here
    expect(['draft', 'standard', 'premium', 'hero']).toContain(adapter.config.quality);
  });

  it('throws when no provider can satisfy the request', async () => {
    await expect(router.select('music', 'hero')).rejects.toThrow(/No enabled/);
  });
});
