import {existsSync} from 'node:fs';

/**
 * Load a local .env into process.env — zero dependencies (Node 20.12+/22 native).
 * Real API keys live in .env (gitignored); adapters read them from process.env.
 * Called once at CLI startup. Missing file is fine (mocks need no keys).
 */
export function loadEnv(path = '.env'): void {
  if (!existsSync(path)) return;
  try {
    process.loadEnvFile(path);
  } catch {
    /* malformed or unreadable .env — adapters will report the specific missing key */
  }
}
