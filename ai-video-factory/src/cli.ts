import {fileURLToPath} from 'node:url';
import {QUALITY_TIERS, type Modality, type QualityTier} from './core/types.js';
import {createAssetStore} from './cache/assetStore.js';
import {ProviderRegistry} from './providers/registry.js';
import {CostRouter} from './providers/router.js';
import {generate} from './pipeline/generate.js';

const MODALITIES: Modality[] = ['image', 'video', 'voice', 'music'];

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(argv: string[]): Promise<void> {
  const [modality, prompt, ...rest] = argv;

  if (!modality || !MODALITIES.includes(modality as Modality) || !prompt) {
    console.error(
      'Usage: factory <image|video|voice|music> "<prompt>" ' +
        '[--tier draft|standard|premium|hero] [--provider <id>] [--config <path>]',
    );
    process.exit(1);
  }

  const tier = (flag(rest, 'tier') ?? 'draft') as QualityTier;
  if (!QUALITY_TIERS.includes(tier)) throw new Error(`Unknown tier: ${tier}`);

  const registry = ProviderRegistry.fromFile(flag(rest, 'config') ?? 'config/providers.yaml');
  const deps = {registry, router: new CostRouter(registry), store: createAssetStore()};

  const result = await generate(
    {modality: modality as Modality, prompt, tier, providerId: flag(rest, 'provider')},
    deps,
  );

  console.log('\n─── result ───────────────────────────────');
  console.log(`provider : ${result.providerId}`);
  console.log(`cache    : ${result.cacheHit ? 'HIT (reused, $0)' : 'MISS (generated)'}`);
  console.log(`cost     : $${result.costUsd.toFixed(4)}`);
  console.log(`bytes    : ${result.asset.bytes}`);
  console.log(`uri      : ${result.asset.uri}`);
  console.log('──────────────────────────────────────────\n');
}

// Run only when invoked directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
