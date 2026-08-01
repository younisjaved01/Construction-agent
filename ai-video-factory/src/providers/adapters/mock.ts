import type {GeneratedBytes, GenerateInput, ProviderAdapter, ProviderConfig} from '../types.js';

/**
 * Offline placeholder adapter. Produces deterministic output for any modality so
 * the whole pipeline (router → cache → store) runs with zero infra, zero cost and
 * zero network — used for tests, dry runs, and local development.
 */
class MockAdapter implements ProviderAdapter {
  readonly id: string;
  constructor(readonly config: ProviderConfig) {
    this.id = config.id;
  }

  estimateCost(): number {
    return this.config.cost_per_unit; // 0
  }

  async generate(input: GenerateInput): Promise<GeneratedBytes> {
    if (this.config.modality === 'text') {
      return input.params.kind === 'metadata' ? this.mockMetadata(input) : this.mockStory(input);
    }
    if (this.config.modality === 'image') return this.mockImage(input);
    // video / voice / music placeholder — bytes flow through the pipeline so
    // caching, budgeting and manifests all work offline (not a playable file).
    const label = `MOCK ${this.config.modality} · ${this.config.model} · ${input.prompt.slice(0, 40)}`;
    const contentType = this.config.modality === 'video' ? 'video/mp4' : 'audio/mpeg';
    return {bytes: new TextEncoder().encode(label), contentType};
  }

  /** A valid multi-scene story JSON derived from the topic (see content/story.ts). */
  private mockStory(input: GenerateInput): GeneratedBytes {
    const topic = String(input.params.topic ?? input.prompt).replace(/\s+/g, ' ').trim().slice(0, 80) || 'a short lesson';
    const story = {
      title: `The Story of ${topic}`,
      niche: 'general',
      hook: `Have you ever wondered about ${topic}?`,
      scenes: [
        {index: 1, script: `Here is where our journey into ${topic} begins.`},
        {index: 2, script: `Then something surprising happens that changes everything.`},
        {index: 3, script: `And in the end, we learn what ${topic} truly means.`},
      ],
      cta: 'Follow for more.',
    };
    return {bytes: new TextEncoder().encode(JSON.stringify(story)), contentType: 'application/json'};
  }

  /** Platform-ready metadata JSON derived from the title (see packaging/metadata.ts). */
  private mockMetadata(input: GenerateInput): GeneratedBytes {
    const title = String(input.params.title ?? input.prompt).replace(/\s+/g, ' ').trim().slice(0, 90) || 'Untitled';
    const meta = {
      title,
      description: `${title} — a short you won't want to miss. Watch till the end.`,
      tags: ['shorts', 'story', 'viral', 'fyp', 'foryou'],
      platforms: {
        youtube: {title: `${title} #Shorts`, description: `${title}\n\nSubscribe for more.`},
        tiktok: {caption: `${title} #fyp #foryou #story`},
        instagram: {caption: `${title} ✨ #reels #explore #story`},
      },
    };
    return {bytes: new TextEncoder().encode(JSON.stringify(meta)), contentType: 'application/json'};
  }

  private mockImage(input: GenerateInput): GeneratedBytes {
    const text = input.prompt.slice(0, 60).replace(/[<&>]/g, ' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
  <rect width="100%" height="100%" fill="#14213a"/>
  <text x="540" y="940" fill="#f7d774" font-family="sans-serif" font-size="42"
        text-anchor="middle">MOCK · ${this.config.model}</text>
  <text x="540" y="1010" fill="#ffffff" font-family="sans-serif" font-size="30"
        text-anchor="middle">${text}</text>
</svg>`;
    return {bytes: new TextEncoder().encode(svg), contentType: 'image/svg+xml'};
  }
}

export function create(config: ProviderConfig): ProviderAdapter {
  return new MockAdapter(config);
}
