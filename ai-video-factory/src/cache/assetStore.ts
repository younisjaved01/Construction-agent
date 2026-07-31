import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import type {AssetRef} from '../core/types.js';

/**
 * Content-addressed asset store. Keyed by hash, so the same asset is never
 * stored — or paid for — twice. Local filesystem backend ships now; S3/R2
 * (MinIO in dev, Cloudflare R2 in prod) plugs in behind the same interface.
 */
export interface AssetStore {
  has(hash: string): Promise<boolean>;
  get(hash: string): Promise<AssetRef | null>;
  put(hash: string, bytes: Uint8Array, contentType: string): Promise<AssetRef>;
  /** Read the raw bytes back (used to decode cached text/LLM outputs). */
  readBytes(hash: string): Promise<Uint8Array | null>;
}

const EXT: Record<string, string> = {
  'text/plain': 'txt',
  'application/json': 'json',
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};
const extFor = (ct: string): string => EXT[ct] ?? 'bin';

class LocalAssetStore implements AssetStore {
  constructor(private readonly dir: string) {}

  private meta(hash: string): string {
    return join(this.dir, `${hash}.meta.json`);
  }

  async has(hash: string): Promise<boolean> {
    try {
      await access(this.meta(hash));
      return true;
    } catch {
      return false;
    }
  }

  async get(hash: string): Promise<AssetRef | null> {
    try {
      return JSON.parse(await readFile(this.meta(hash), 'utf8')) as AssetRef;
    } catch {
      return null;
    }
  }

  async readBytes(hash: string): Promise<Uint8Array | null> {
    const ref = await this.get(hash);
    if (!ref) return null;
    const path = ref.uri.replace(/^local:\/\//, '');
    try {
      return new Uint8Array(await readFile(path));
    } catch {
      return null;
    }
  }

  async put(hash: string, bytes: Uint8Array, contentType: string): Promise<AssetRef> {
    await mkdir(this.dir, {recursive: true});
    const file = join(this.dir, `${hash}.${extFor(contentType)}`);
    await writeFile(file, bytes);
    const ref: AssetRef = {
      hash,
      uri: `local://${resolve(file)}`,
      contentType,
      bytes: bytes.byteLength,
    };
    await writeFile(this.meta(hash), JSON.stringify(ref));
    return ref;
  }
}

/** Build the store the environment asks for. */
export function createAssetStore(env: NodeJS.ProcessEnv = process.env): AssetStore {
  const backend = env.ASSET_STORE ?? 'local';
  if (backend === 'local') {
    return new LocalAssetStore(env.ASSET_LOCAL_DIR ?? './data/assets');
  }
  // S3/MinIO/R2 backend arrives with the deployment milestone.
  throw new Error(`ASSET_STORE="${backend}" not implemented yet (use "local" for now).`);
}
