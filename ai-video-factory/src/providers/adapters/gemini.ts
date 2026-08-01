import type {GeneratedBytes, GenerateInput, ProviderAdapter, ProviderConfig} from '../types.js';

/**
 * Google Gemini text adapter — used by the Story / Metadata generators. Gemini's
 * free tier makes it the $0 default for script reasoning. Fully swappable: point
 * the same modality at `openai` or `anthropic` by flipping providers in config.
 * The model string comes from config, so upgrading (e.g. flash → pro) is a YAML
 * change, never code. Outputs are cached by the pipeline → identical prompt = $0.
 */
class GeminiAdapter implements ProviderAdapter {
  readonly id: string;
  constructor(readonly config: ProviderConfig) {
    this.id = config.id;
  }

  estimateCost(): number {
    return this.config.cost_per_unit; // flat per-call estimate; refine with tokens later
  }

  async generate(input: GenerateInput): Promise<GeneratedBytes> {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set (add it to .env).');

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(this.config.model)}:generateContent?key=${encodeURIComponent(key)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        ...(input.params.system
          ? {system_instruction: {parts: [{text: String(input.params.system)}]}}
          : {}),
        contents: [{role: 'user', parts: [{text: input.prompt}]}],
        generationConfig: {
          maxOutputTokens: Number(input.params.max_tokens ?? 2048),
          temperature: Number(input.params.temperature ?? 0.9),
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {
      candidates?: {content?: {parts?: {text?: string}[]}}[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini: empty response');
    return {bytes: new TextEncoder().encode(text), contentType: 'text/plain'};
  }
}

export function create(config: ProviderConfig): ProviderAdapter {
  return new GeminiAdapter(config);
}
