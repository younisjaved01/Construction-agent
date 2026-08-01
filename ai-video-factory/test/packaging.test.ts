import {describe, it, expect} from 'vitest';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAssetStore} from '../src/cache/assetStore.js';
import {ProviderRegistry} from '../src/providers/registry.js';
import {CostRouter} from '../src/providers/router.js';
import {generateStory} from '../src/content/story.js';
import {buildThumbnailPrompt, generateThumbnail} from '../src/packaging/thumbnail.js';
import {generateMetadata} from '../src/packaging/metadata.js';

const deps = () => {
  const registry = ProviderRegistry.fromFile('config/providers.yaml');
  process.env.ASSET_LOCAL_DIR = join(tmpdir(), `avf-${randomUUID()}`);
  return {registry, router: new CostRouter(registry), store: createAssetStore()};
};

describe('Thumbnail generator', () => {
  it('builds an aspect-aware, text-free brief', () => {
    const wide = buildThumbnailPrompt({title: 'Lost City', aspect: 'wide'});
    const tall = buildThumbnailPrompt({title: 'Lost City', aspect: 'vertical'});
    expect(wide).toContain('16:9');
    expect(tall).toContain('9:16');
    expect(wide).toContain('no on-image text');
    expect(wide).toContain('Lost City');
  });

  it('generates a thumbnail asset at $0 through the mock pipeline', async () => {
    const d = deps();
    const t = await generateThumbnail({title: 'The Ocean'}, d);
    expect(t.asset.uri).toContain('local://');
    expect(t.costUsd).toBe(0);
  });
});

describe('Metadata generator', () => {
  it('produces validated platform-ready metadata', async () => {
    const d = deps();
    const story = await generateStory({topic: 'gratitude', sceneCount: 3}, d);
    const meta = await generateMetadata(story, d);
    expect(meta.title).toBeTruthy();
    expect(meta.tags.length).toBeGreaterThan(0);
    expect(meta.platforms.youtube?.title).toContain('#Shorts');
    expect(meta.platforms.tiktok?.caption).toBeTruthy();
  });

  it('caches identical metadata at $0 on a repeat story', async () => {
    const d = deps();
    const story = await generateStory({topic: 'patience', sceneCount: 2}, d);
    const first = await generateMetadata(story, d);
    const second = await generateMetadata(story, d);
    expect(second.title).toBe(first.title);
  });
});
