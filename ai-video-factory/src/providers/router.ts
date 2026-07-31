import {log} from '../core/logger.js';
import {tierRank, type Modality, type QualityTier} from '../core/types.js';
import type {ProviderRegistry} from './registry.js';
import type {ProviderAdapter} from './types.js';

/**
 * COST ROUTER — the brain of "always use the cheapest model that's good enough".
 *
 * Given a modality + required quality tier, it considers every enabled provider
 * that can satisfy the tier and returns the CHEAPEST one. Because self-hosted
 * models have cost 0, they win automatically the moment they're enabled — that's
 * how the same code moves from paid-API to local-GPU with zero rewrites.
 */
export class CostRouter {
  constructor(private readonly registry: ProviderRegistry) {}

  async select(
    modality: Modality,
    tier: QualityTier,
    opts: {providerId?: string; maxCost?: number} = {},
  ): Promise<ProviderAdapter> {
    // Explicit pin bypasses routing (e.g. force a hero shot on a premium model).
    if (opts.providerId) return this.registry.get(opts.providerId);

    const candidates = this.registry
      .list(modality)
      .filter((p) => tierRank(p.quality) >= tierRank(tier))
      .filter((p) => opts.maxCost === undefined || p.cost_per_unit <= opts.maxCost)
      // cheapest first; break ties by the lowest sufficient quality (leave headroom)
      .sort((a, b) => a.cost_per_unit - b.cost_per_unit || tierRank(a.quality) - tierRank(b.quality));

    const chosen = candidates[0];
    if (!chosen) {
      throw new Error(
        `No enabled ${modality} provider satisfies tier "${tier}"` +
          (opts.maxCost !== undefined ? ` under $${opts.maxCost}/unit` : '') +
          `. Enable one in config/providers.yaml.`,
      );
    }

    log.debug('router.select', {
      modality,
      tier,
      chosen: chosen.id,
      costPerUnit: chosen.cost_per_unit,
      considered: candidates.map((c) => c.id),
    });
    return this.registry.get(chosen.id);
  }
}
