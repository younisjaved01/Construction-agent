import type {GeneratedBytes, GenerateInput, ProviderAdapter, ProviderConfig} from '../types.js';

/**
 * ElevenLabs TTS adapter. The specific voice (your reusable cloned voice) comes
 * in via params.voiceId, so the same code serves any voice — and swapping to
 * MiniMax / local VibeVoice is just another adapter behind the same interface.
 */
class ElevenLabsAdapter implements ProviderAdapter {
  readonly id: string;
  constructor(readonly config: ProviderConfig) {
    this.id = config.id;
  }

  estimateCost(input: GenerateInput): number {
    return this.config.cost_per_unit * input.prompt.length; // priced per character
  }

  async generate(input: GenerateInput): Promise<GeneratedBytes> {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error('ELEVENLABS_API_KEY is not set.');
    const voiceId =
      String(input.params.voiceId ?? '') || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {'xi-api-key': key, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        text: input.prompt,
        model_id: this.config.model,
        voice_settings: {stability: 0.5, similarity_boost: 0.75},
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    return {bytes: new Uint8Array(await res.arrayBuffer()), contentType: 'audio/mpeg'};
  }
}

export function create(config: ProviderConfig): ProviderAdapter {
  return new ElevenLabsAdapter(config);
}
