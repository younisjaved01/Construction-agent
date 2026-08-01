import type {GeneratedBytes, GenerateInput, ProviderAdapter, ProviderConfig} from '../types.js';

/**
 * OpenAI (GPT) text adapter — a drop-in alternative to the Gemini/Anthropic story
 * generators. Uses the Chat Completions API. Base URL is overridable via
 * OPENAI_BASE_URL, so any OpenAI-compatible endpoint (Together, Groq, a local
 * llama.cpp/Ollama server, …) works with the SAME adapter — just point the env
 * var and model at it. Pipeline caches results → identical prompt = $0.
 */
class OpenAiAdapter implements ProviderAdapter {
  readonly id: string;
  constructor(readonly config: ProviderConfig) {
    this.id = config.id;
  }

  estimateCost(): number {
    return this.config.cost_per_unit;
  }

  async generate(input: GenerateInput): Promise<GeneratedBytes> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set (add it to .env).');
    const base = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';

    const messages: {role: string; content: string}[] = [];
    if (input.params.system) messages.push({role: 'system', content: String(input.params.system)});
    messages.push({role: 'user', content: input.prompt});

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {authorization: `Bearer ${key}`, 'content-type': 'application/json'},
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: Number(input.params.max_tokens ?? 2048),
        temperature: Number(input.params.temperature ?? 0.9),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {choices?: {message?: {content?: string}}[]};
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('OpenAI: empty response');
    return {bytes: new TextEncoder().encode(text), contentType: 'text/plain'};
  }
}

export function create(config: ProviderConfig): ProviderAdapter {
  return new OpenAiAdapter(config);
}
