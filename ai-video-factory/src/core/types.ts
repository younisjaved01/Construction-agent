// Domain vocabulary shared across the whole factory.

export type Modality = 'text' | 'image' | 'video' | 'voice' | 'music';

/** Quality tiers, ascending. The router treats a provider's `quality` as the
 *  highest tier it satisfies, and picks the cheapest that meets the request. */
export const QUALITY_TIERS = ['draft', 'standard', 'premium', 'hero'] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];
export const tierRank = (t: QualityTier): number => QUALITY_TIERS.indexOf(t);

/** A stored, content-addressed asset (bytes live in the asset store). */
export interface AssetRef {
  hash: string;
  uri: string;
  contentType: string;
  bytes: number;
}

/** A single generation request handed to the pipeline. */
export interface GenerationRequest {
  modality: Modality;
  prompt: string;
  tier: QualityTier;
  params?: Record<string, unknown>;
  /** Pin a specific provider id (skips the router). */
  providerId?: string;
  /** Reference asset hashes/URIs (e.g. keyframe → image-to-video). */
  references?: string[];
}

export interface GenerationResult {
  asset: AssetRef;
  providerId: string;
  costUsd: number;
  cacheHit: boolean;
}
