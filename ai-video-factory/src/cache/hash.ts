import {createHash} from 'node:crypto';

/** Deterministic key-sorted stringify so identical requests hash identically. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Content address for a generation. Anything that would change the output
 * (model, prompt, params, references) is part of the key — so an identical
 * request is a guaranteed cache hit and costs $0.
 */
export function assetHash(input: {
  modality: string;
  model: string;
  prompt: string;
  params?: Record<string, unknown>;
  references?: string[];
}): string {
  const key = canonical({
    modality: input.modality,
    model: input.model,
    prompt: input.prompt.trim(),
    params: input.params ?? {},
    references: input.references ?? [],
  });
  return createHash('sha256').update(key).digest('hex');
}
