// `hedgehog friction add`/`hedgehog friction list` — writes and reads the
// `friction` table, replacing the file-based `.hedgehog/friction.md` log.
// See hedgehog-persistent-build-graph.md, Schema, and
// src/skills/hedgehog-loop/SKILL.md's Friction log section.

const insertFriction = (db) =>
  db.prepare(`
    INSERT INTO friction (task_id, note)
    VALUES (?, ?)
  `);

// Writes one friction row. `taskId` is optional (the schema's task_id is
// nullable) — a reviewed-marker row (see tweaker.md) has no task_id.
export function addFriction(db, { note, taskId }) {
  if (!note) throw new Error('friction requires a note');
  const result = insertFriction(db).run(taskId ?? null, note);
  return { id: Number(result.lastInsertRowid), taskId: taskId ?? null, note };
}

// Returns every friction row, oldest first, for tweaker's review pass.
export function listFriction(db) {
  return db
    .prepare(`SELECT id, task_id AS taskId, note, logged_at AS loggedAt FROM friction ORDER BY id ASC`)
    .all();
}
