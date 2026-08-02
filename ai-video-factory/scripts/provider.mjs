// Enable/disable a provider in config/providers.yaml without hand-editing YAML.
//   node scripts/provider.mjs <provider-id> <on|off>
//   node scripts/provider.mjs list
// Keeps comments intact; flips only the `enabled:` line inside the matching block.
import {readFileSync, writeFileSync} from 'node:fs';

const path = process.env.PROVIDERS_FILE ?? 'config/providers.yaml';
const [, , id, state] = process.argv;

const lines = readFileSync(path, 'utf8').split('\n');

if (id === 'list' || !id) {
  let curId = '';
  for (const line of lines) {
    const m = line.match(/^\s*-\s*id:\s*([\w-]+)/);
    if (m) curId = m[1];
    const e = line.match(/^\s*enabled:\s*(true|false)/);
    if (e && curId) console.log(`${e[1] === 'true' ? '✅ on ' : '⬜ off'}  ${curId}`);
  }
  if (!id) {
    console.log('\nUsage: node scripts/provider.mjs <provider-id> <on|off>');
    process.exit(id === 'list' ? 0 : 1);
  }
  process.exit(0);
}

if (state !== 'on' && state !== 'off') {
  console.error('Usage: node scripts/provider.mjs <provider-id> <on|off>  (or: list)');
  process.exit(1);
}

const want = state === 'on' ? 'true' : 'false';
let inBlock = false;
let done = false;
for (let i = 0; i < lines.length; i++) {
  if (/^\s*-\s*id:\s*/.test(lines[i])) {
    inBlock = new RegExp(`^\\s*-\\s*id:\\s*${id}\\b`).test(lines[i]);
  } else if (inBlock && /^\s*enabled:\s*(true|false)/.test(lines[i])) {
    lines[i] = lines[i].replace(/(enabled:\s*)(true|false)/, `$1${want}`);
    done = true;
    inBlock = false;
  }
}

if (!done) {
  console.error(`Provider "${id}" not found (or has no enabled: line). Try: node scripts/provider.mjs list`);
  process.exit(1);
}
writeFileSync(path, lines.join('\n'));
console.log(`${id} → enabled: ${want}`);
