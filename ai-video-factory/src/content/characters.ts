import {randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

/** A reusable character with a locked identity. Once created it is NEVER
 *  regenerated — every scene reuses the same description + reference. */
export interface Character {
  id: string;
  name: string;
  description: string;
  style?: string;
  referenceHash?: string; // content hash of the locked reference image
  refAssetUri?: string;
  createdAt: string;
}

export interface CharacterRepo {
  get(name: string): Promise<Character | null>;
  list(): Promise<Character[]>;
  upsert(character: Character): Promise<Character>;
}

/** Dev-default repo (JSON file). Swap for a Prisma/Postgres repo in deployment. */
class JsonCharacterRepo implements CharacterRepo {
  constructor(private readonly file: string) {}

  private async readAll(): Promise<Character[]> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as Character[];
    } catch {
      return [];
    }
  }
  private async writeAll(list: Character[]): Promise<void> {
    await mkdir(dirname(this.file), {recursive: true});
    await writeFile(this.file, JSON.stringify(list, null, 2));
  }

  async get(name: string): Promise<Character | null> {
    const list = await this.readAll();
    return list.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
  }
  async list(): Promise<Character[]> {
    return this.readAll();
  }
  async upsert(character: Character): Promise<Character> {
    const list = await this.readAll();
    const i = list.findIndex(
      (c) => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase(),
    );
    if (i >= 0) list[i] = character;
    else list.push(character);
    await this.writeAll(list);
    return character;
  }
}

export function createCharacterRepo(env: NodeJS.ProcessEnv = process.env): CharacterRepo {
  return new JsonCharacterRepo(env.CHARACTER_DB ?? './data/characters.json');
}

/** The public API for character consistency. */
export class CharacterManager {
  constructor(private readonly repo: CharacterRepo) {}

  /** Return the existing character (never regenerate) or create it once. */
  async getOrCreate(input: {
    name: string;
    description: string;
    style?: string;
  }): Promise<{character: Character; created: boolean}> {
    const existing = await this.repo.get(input.name);
    if (existing) return {character: existing, created: false};

    const character: Character = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      style: input.style,
      createdAt: new Date().toISOString(),
    };
    await this.repo.upsert(character);
    return {character, created: true};
  }

  /** Pin the locked reference image so future scenes reuse it (consistency). */
  async attachReference(name: string, referenceHash: string, refAssetUri: string): Promise<Character> {
    const c = await this.repo.get(name);
    if (!c) throw new Error(`Unknown character: ${name}`);
    return this.repo.upsert({...c, referenceHash, refAssetUri});
  }

  list(): Promise<Character[]> {
    return this.repo.list();
  }
}
