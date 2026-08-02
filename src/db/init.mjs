// `hedgehog db init` — creates .hedgehog/hedgehog.db if absent, no-ops if
// present. See hedgehog-persistent-build-graph.md, "The CLI is the only
// writer".

import { DatabaseSync } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { applySchema } from './schema.mjs';

export const DB_PATH = '.hedgehog/hedgehog.db';

const exists = (p) =>
  access(p, constants.F_OK).then(
    () => true,
    () => false,
  );

// Returns { created: boolean, path } — created is false when the DB file
// already existed (no-op per the spec).
export async function dbInit(dbPath = DB_PATH) {
  const already = await exists(dbPath);
  await mkdir(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    if (!already) applySchema(db);
  } finally {
    db.close();
  }

  return { created: !already, path: dbPath };
}
