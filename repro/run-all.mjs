// Runs every reproduction in this directory, in order, and exits
// non-zero if any of them fails.
//
//   node --experimental-sqlite repro/run-all.mjs

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const scripts = readdirSync(HERE)
  .filter((f) => /^\d+-.*\.mjs$/.test(f))
  .sort();

const failed = [];
for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync(process.execPath, ['--experimental-sqlite', join(HERE, script)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) failed.push(script);
}

console.log('');
if (failed.length > 0) {
  console.log(`${failed.length} of ${scripts.length} reproduction(s) failed:`);
  for (const f of failed) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`all ${scripts.length} reproduction(s) passed`);
