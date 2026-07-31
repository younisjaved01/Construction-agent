import type {GeneratedBytes, GenerateInput, ProviderAdapter, ProviderConfig} from '../types.js';

/**
 * Anthropic (Claude) text adapter — used by the Story Generator. Like every
 * adapter it's swappable: point the story generator at `openai`, a local Ollama
 * model, etc. by flipping providers in config. Outputs are cached by the
 * pipeline, so regenerating an identical story costs $0.
 */
class AnthropicAdapter implements ProviderAdapter {
  readonly id: string;
  constructor(readonly config: ProviderConfig) {
    this.id = config.id;
  }

  estimateCost(): number {
    return this.config.cost_per_unit; // flat per-call estimate; refine with tokens later
  }

  async generate(input: GenerateInput): Promise<GeneratedBytes> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set (enable it in .env).');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: Number(input.params.max_tokens ?? 2000),
        ...(input.params.system ? {system: String(input.params.system)} : {}),
        messages: [{role: 'user', content: input.prompt}],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {content?: {type: string; text?: string}[]};
    const text = data.content?.map((c) => c.text ?? '').join('') ?? '';
    if (!text) throw new Error('Anthropic: empty response');
    return {bytes: new TextEncoder().encode(text), contentType: 'text/plain'};
  }
}

export function create(config: ProviderConfig): ProviderAdapter {
  return new AnthropicAdapter(config);
}
