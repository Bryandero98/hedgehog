// `hedgehog decision add` / `hedgehog decision list` — declared decisions
// between tasks. See schema.mjs's `decisions` table and next.mjs's
// INHERITED DECISIONS packet section.
//
// A layer that chose a pattern, a library, or a trade-off while building
// has no way to tell the layer that inherits from it *why* — only debt.mjs
// exists for that, and debt is specifically a known limitation, not a
// decision that was made correctly and simply needs to be known. A
// "we chose X because Y" comment in a source file is not a mechanism: the
// inheriting task's packet is assembled from the graph, not from reading
// its dependencies' comments, so the note never arrives. `decision add`
// records the note against the declaring task, and next.mjs renders it
// into the packet of every task that depends on it.
//
// Same as debt: nothing is written to a committed markdown log, so a
// decision has no source `hedgehog db rebuild` could replay it from —
// rebuild.mjs carries debt, decisions, and friction across a rebuild by
// task id instead, for exactly this reason.

import { applySchema } from './schema.mjs';

const insertDecision = (db) =>
  db.prepare(`
    INSERT INTO decisions (task_id, note)
    VALUES (?, ?)
  `);

function taskExists(db, taskId) {
  return db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId) !== undefined;
}

// Writes one decision row against `taskId`. The task must exist — a
// decision addressed to nobody reaches nobody, and the schema's foreign
// key would reject it anyway, less legibly.
export function addDecision(db, { taskId, note }) {
  // Idempotent, and the migration path for a build graph created before
  // the `decisions` table existed: dbInit only applies the schema to a DB
  // it just created, so an in-flight project's DB would otherwise have no
  // table to insert into.
  applySchema(db);

  if (!taskId) throw new Error('decision requires a task id');
  if (!note) throw new Error('decision requires a note');
  if (!taskExists(db, taskId)) throw new Error(`no such task: ${taskId}`);

  const result = insertDecision(db).run(taskId, note);
  return { id: Number(result.lastInsertRowid), taskId, note };
}

// Every decision row, oldest first, optionally narrowed to one task.
export function listDecisions(db, taskId) {
  const where = taskId ? 'WHERE task_id = ?' : '';
  const params = taskId ? [taskId] : [];
  try {
    return db
      .prepare(
        `SELECT id, task_id AS taskId, note, logged_at AS loggedAt FROM decisions ${where} ORDER BY id ASC`,
      )
      .all(...params);
  } catch {
    // No `decisions` table yet (a build graph from before this table existed).
    return [];
  }
}
