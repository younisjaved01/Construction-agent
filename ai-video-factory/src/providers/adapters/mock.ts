import type {GeneratedBytes, GenerateInput, ProviderAdapter, ProviderConfig} from '../types.js';

/**
 * Offline placeholder adapter. Produces a deterministic SVG "keyframe" so the
 * whole pipeline (router → cache → store → DB) runs with zero infra, zero cost
 * and zero network — used for tests, dry runs, and local development.
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
