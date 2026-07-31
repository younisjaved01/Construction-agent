import {log} from '../core/logger.js';
import type {GenerationRequest, GenerationResult} from '../core/types.js';
import type {AssetStore} from '../cache/assetStore.js';
import {assetHash} from '../cache/hash.js';
import type {ProviderRegistry} from '../providers/registry.js';
import type {CostRouter} from '../providers/router.js';

export interface PipelineDeps {
  registry: ProviderRegistry;
  router: CostRouter;
  store: AssetStore;
}

/** Route a request and return the worst-case (no-cache) cost — used by the
 *  BudgetGuard to refuse a job BEFORE any money is spent. */
export async function estimate(
  req: GenerationRequest,
  deps: PipelineDeps,
): Promise<{providerId: string; costUsd: number}> {
  const adapter = await deps.router.select(req.modality, req.tier, {providerId: req.providerId});
  const params = {...adapter.config.params, ...req.params};
  return {
    providerId: adapter.id,
    costUsd: adapter.estimateCost({prompt: req.prompt, params, references: req.references}),
  };
}

/**
 * The one function every modality flows through:
 *   route → content-address → cache-check → generate → store.
 *
 * Caching is keyed on (model + prompt + params + references), so a repeat request
 * returns instantly at $0. This single choke point is where cost control lives.
 */
export async function generate(
  req: GenerationRequest,
  deps: PipelineDeps,
): Promise<GenerationResult> {
  const adapter = await deps.router.select(req.modality, req.tier, {providerId: req.providerId});
  const params = {...adapter.config.params, ...req.params};

  const hash = assetHash({
    modality: req.modality,
    model: adapter.config.model,
    prompt: req.prompt,
    params,
    references: req.references,
  });

  const cached = await deps.store.get(hash);
  if (cached) {
    log.info('cache.hit', {hash, provider: adapter.id});
    return {asset: cached, providerId: adapter.id, costUsd: 0, cacheHit: true};
  }

  const input = {prompt: req.prompt, params, references: req.references};
  const costUsd = adapter.estimateCost(input);
  log.info('generate.start', {provider: adapter.id, model: adapter.config.model, costUsd});

  const out = await adapter.generate(input);
  const asset = await deps.store.put(hash, out.bytes, out.contentType);

  log.info('generate.done', {hash, provider: adapter.id, bytes: asset.bytes, costUsd});
  return {asset, providerId: adapter.id, costUsd, cacheHit: false};
}
