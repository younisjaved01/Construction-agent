import {describe, it, expect, beforeEach} from 'vitest';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAssetStore} from '../src/cache/assetStore.js';
import {ProviderRegistry} from '../src/providers/registry.js';
import {CostRouter} from '../src/providers/router.js';
import {produce} from '../src/generation/produce.js';
import {BudgetGuard, BudgetExceededError} from '../src/generation/budget.js';

function deps() {
  const registry = ProviderRegistry.fromFile('config/providers.yaml');
  process.env.ASSET_LOCAL_DIR = join(tmpdir(), `avf-${randomUUID()}`);
  process.env.PROJECTS_DIR = join(tmpdir(), `proj-${randomUUID()}`);
  process.env.CHARACTER_DB = join(tmpdir(), `chars-${randomUUID()}.json`);
  return {registry, router: new CostRouter(registry), store: createAssetStore()};
}

describe('BudgetGuard', () => {
  it('throws before exceeding the cap and ignores $0 hits', () => {
    const g = new BudgetGuard(0.1);
    g.check(0.05);
    g.record(0.05);
    g.check(0); // cache hit — always fine
    expect(() => g.check(0.06)).toThrow(BudgetExceededError);
  });
});

describe('produce (mock providers)', () => {
  it('generates a keyframe + clip per scene and writes a manifest', async () => {
    const result = await produce(
      {
        topic: 'patience',
        sceneCount: 3,
        character: {name: 'Ayaan', description: 'a small white rabbit in a kufi'},
        makeVideo: true,
        budgetUsd: 5,
      },
      deps(),
    );
    expect(result.scenes).toHaveLength(3);
    expect(result.scenes[0]!.keyframe.uri).toContain('local://');
    expect(result.scenes[0]!.clip).toBeDefined();
    expect(result.character).toBe('Ayaan');
    expect(result.totalCostUsd).toBe(0); // all mock
    expect(result.manifestPath).toMatch(/\.json$/);
  });
});
