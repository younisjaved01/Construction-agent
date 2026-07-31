import type {Modality, QualityTier} from '../core/types.js';

/** One row of config/providers.yaml. */
export interface ProviderConfig {
  id: string;
  modality: Modality;
  adapter: string; // 'mock' | 'fal' | 'comfy' | 'elevenlabs' | ...
  model: string;
  quality: QualityTier; // highest tier this provider reliably satisfies
  cost_per_unit: number; // USD per `unit`
  unit: string; // image | clip | char | second ...
  enabled: boolean;
  params?: Record<string, unknown>;
}

export interface GenerateInput {
  prompt: string;
  params: Record<string, unknown>;
  references?: string[];
}

export interface GeneratedBytes {
  bytes: Uint8Array;
  contentType: string;
}

/**
 * The contract EVERY provider implements. Adapters do pure generation only —
 * caching, hashing, storage and DB records are the pipeline's job. This is what
 * makes vendors hot-swappable: the rest of the system depends on this interface,
 * never on a concrete vendor.
 */
export interface ProviderAdapter {
  readonly id: string;
  readonly config: ProviderConfig;
  generate(input: GenerateInput): Promise<GeneratedBytes>;
  /** Estimate USD cost for this input (used by router + budget guard). */
  estimateCost(input: GenerateInput): number;
}

/** Each adapter module exports a `create` factory. */
export interface AdapterModule {
  create(config: ProviderConfig): ProviderAdapter;
}
