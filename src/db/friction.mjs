// `hedgehog friction add`/`hedgehog friction list` — writes and reads the
// `friction` table. See hedgehog-persistent-build-graph.md, Schema, and
// src/skills/hedgehog-loop/SKILL.md's Friction log section.
//
// Every entry is also appended to FRICTION_LOG_PATH — a friction log you
// can't read in a PR is one nobody reads, and the DB is a derived
// artifact (rebuildable via `hedgehog db rebuild`) that can't be diffed
// in review the way a plain-text log can.

import { mkdir, appendFile } from 'node:fs/promises';

export const FRICTION_DIR = '.hedgehog/friction';
export const FRICTION_LOG_PATH = `${FRICTION_DIR}/log.md`;

const insertFriction = (db) =>
  db.prepare(`
    INSERT INTO friction (task_id, note)
    VALUES (?, ?)
  `);

// Writes one friction row. `taskId` is optional (the schema's task_id is
// nullable) — a reviewed-marker row (see tweaker.md) has no task_id.
export async function addFriction(db, { note, taskId }) {
  if (!note) throw new Error('friction requires a note');
  const result = insertFriction(db).run(taskId ?? null, note);
  const entry = { id: Number(result.lastInsertRowid), taskId: taskId ?? null, note };

  await mkdir(FRICTION_DIR, { recursive: true });
  const header = `## ${new Date().toISOString()}${taskId ? ` ${taskId}` : ''}`;
  await appendFile(FRICTION_LOG_PATH, `${header}\n\n${note}\n\n`);

  return entry;
}

// Returns every friction row, oldest first, for tweaker's review pass.
export function listFriction(db) {
  return db
    .prepare(`SELECT id, task_id AS taskId, note, logged_at AS loggedAt FROM friction ORDER BY id ASC`)
    .all();
}
