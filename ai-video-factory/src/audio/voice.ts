import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {AssetRef, QualityTier} from '../core/types.js';
import {generate, type PipelineDeps} from '../pipeline/generate.js';

/**
 * A reusable voice identity: a provider + a (cloned) voiceId. Stored once and
 * reused across every scene and every video — the voice is NEVER re-cloned.
 */
export interface VoiceProfile {
  name: string;
  providerId: string; // voice provider from config (e.g. elevenlabs, mock-voice)
  voiceId: string; // the cloned/selected voice at that provider
  createdAt: string;
}

class JsonVoiceRepo {
  constructor(private readonly file: string) {}
  private async readAll(): Promise<VoiceProfile[]> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as VoiceProfile[];
    } catch {
      return [];
    }
  }
  async get(name: string): Promise<VoiceProfile | null> {
    return (await this.readAll()).find((v) => v.name === name) ?? null;
  }
  async upsert(v: VoiceProfile): Promise<VoiceProfile> {
    const list = await this.readAll();
    const i = list.findIndex((x) => x.name === v.name);
    if (i >= 0) list[i] = v;
    else list.push(v);
    await mkdir(dirname(this.file), {recursive: true});
    await writeFile(this.file, JSON.stringify(list, null, 2));
    return v;
  }
}

export class VoiceManager {
  private readonly repo: JsonVoiceRepo;
  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.repo = new JsonVoiceRepo(env.VOICE_DB ?? './data/voices.json');
  }

  /** Reuse an existing profile or register one — never re-clones a voice. */
  async getOrCreate(name: string, init: {providerId: string; voiceId: string}): Promise<VoiceProfile> {
    const existing = await this.repo.get(name);
    if (existing) return existing;
    return this.repo.upsert({name, ...init, createdAt: new Date().toISOString()});
  }
}

/** Narrate one line with a given voice profile. Cached: same text+voice = $0. */
export async function narrate(
  script: string,
  profile: VoiceProfile,
  deps: PipelineDeps,
  tier: QualityTier = 'standard',
): Promise<{asset: AssetRef; costUsd: number}> {
  const res = await generate(
    {modality: 'voice', prompt: script, tier, providerId: profile.providerId, params: {voiceId: profile.voiceId}},
    deps,
  );
  return {asset: res.asset, costUsd: res.costUsd};
}
