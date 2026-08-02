// `hedgehog status` — graph overview: task counts by status, and the
// current ready list. See hedgehog-persistent-build-graph.md, "Task
// lifecycle" for the status set and "The CLI is the only writer" for the
// `hedgehog status` line.
//
// The ready list reuses next.mjs's readiness query rather than
// reimplementing it: a task is pickable by `hedgehog next` when its
// status is `planned` or `ready` (plan.mjs inserts `planned`;
// verify.mjs's unlockReadyDependents sets `ready` directly) and it has
// no dependency whose status isn't `complete`. `hedgehog status` lists
// every task meeting that condition, not just the one `hedgehog next`
// would pick.

const TASK_STATUSES = [
  'proposed',
  'planned',
  'ready',
  'in_progress',
  'implemented',
  'verifying',
  'verified',
  'complete',
  'failed',
];

const READY_TASKS_SQL = `
  SELECT t.* FROM tasks t
  WHERE t.status IN ('planned', 'ready')
    AND NOT EXISTS (
      SELECT 1 FROM dependencies d
      JOIN tasks dep ON dep.id = d.depends_on_task_id
      WHERE d.task_id = t.id AND dep.status <> 'complete'
    )
  ORDER BY t.priority, t.id;
`;

function countTasksByStatus(db) {
  const rows = db
    .prepare('SELECT status, COUNT(*) AS n FROM tasks GROUP BY status')
    .all();
  const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

function loadReadyTasks(db) {
  return db.prepare(READY_TASKS_SQL).all();
}

// Returns { counts, ready, total } — counts keyed by every status in the
// tasks CHECK constraint (present even at zero), ready the full list of
// currently-pickable tasks, total the sum across all statuses.
export function graphStatus(db) {
  const counts = countTasksByStatus(db);
  const ready = loadReadyTasks(db);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, ready, total };
}

// Renders a graphStatus() result into a plain-text overview: counts by
// status (only non-zero ones, in lifecycle order), then the ready list.
export function formatStatus({ counts, ready, total }) {
  const lines = [];
  lines.push(`TASKS  ${total}`);
  lines.push('');
  for (const status of TASK_STATUSES) {
    if (counts[status] === 0) continue;
    lines.push(`  ${status.padEnd(12)} ${counts[status]}`);
  }
  lines.push('');
  lines.push('READY');
  if (ready.length === 0) {
    lines.push('  (none)');
  } else {
    for (const task of ready) {
      lines.push(`  ${task.id}   ${task.layer}   ${task.objective}`);
    }
  }

  return lines.join('\n');
}
