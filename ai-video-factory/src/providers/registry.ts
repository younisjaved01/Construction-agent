import {readFileSync} from 'node:fs';
import yaml from 'js-yaml';
import {z} from 'zod';
import {QUALITY_TIERS, type Modality} from '../core/types.js';
import type {AdapterModule, ProviderAdapter, ProviderConfig} from './types.js';

const ProviderSchema = z.object({
  id: z.string().min(1),
  modality: z.enum(['text', 'image', 'video', 'voice', 'music']),
  adapter: z.string().min(1),
  model: z.string().min(1),
  quality: z.enum(QUALITY_TIERS),
  cost_per_unit: z.number().nonnegative(),
  unit: z.string().min(1),
  enabled: z.boolean(),
  params: z.record(z.unknown()).optional(),
});
const FileSchema = z.object({providers: z.array(ProviderSchema)});

/**
 * Lazy adapter loaders — the ONLY place adapter modules are referenced by name.
 * A new vendor = a new file + one line here. Only the adapter actually used gets
 * imported at runtime, so heavy SDKs never load for jobs that don't need them.
 */
const ADAPTER_LOADERS: Record<string, () => Promise<AdapterModule>> = {
  mock: () => import('./adapters/mock.js'),
  fal: () => import('./adapters/fal.js'),
  anthropic: () => import('./adapters/anthropic.js'),
  // comfy, elevenlabs, vibevoice … land in later milestones
};

/** Holds the provider catalog and instantiates adapters on demand. */
export class ProviderRegistry {
  private readonly instances = new Map<string, ProviderAdapter>();
  private constructor(private readonly configs: ProviderConfig[]) {}

  static fromFile(path: string): ProviderRegistry {
    const raw = yaml.load(readFileSync(path, 'utf8'));
    const parsed = FileSchema.parse(raw);
    const ids = new Set<string>();
    for (const p of parsed.providers) {
      if (ids.has(p.id)) throw new Error(`Duplicate provider id: ${p.id}`);
      ids.add(p.id);
    }
    return new ProviderRegistry(parsed.providers);
  }

  /** Enabled providers, optionally filtered by modality. */
  list(modality?: Modality): ProviderConfig[] {
    return this.configs.filter((p) => p.enabled && (!modality || p.modality === modality));
  }

  find(id: string): ProviderConfig | undefined {
    return this.configs.find((p) => p.id === id);
  }

  /** Instantiate (and memoize) the adapter for a provider id. */
  async get(id: string): Promise<ProviderAdapter> {
    const existing = this.instances.get(id);
    if (existing) return existing;

    const cfg = this.find(id);
    if (!cfg) throw new Error(`Unknown provider: ${id}`);
    if (!cfg.enabled) throw new Error(`Provider disabled: ${id}`);

    const loader = ADAPTER_LOADERS[cfg.adapter];
    if (!loader) throw new Error(`No adapter registered for "${cfg.adapter}" (provider ${id})`);

    const mod = await loader();
    const adapter = mod.create(cfg);
    this.instances.set(id, adapter);
    return adapter;
  }
}
