// `hedgehog plan` — compiles pending intents against the project's core
// definition into `tasks` + `dependencies` rows. See
// hedgehog-persistent-build-graph.md, "The build graph" and "Task
// lifecycle", plus the readiness SELECT under "Schema".
//
// full-stack-app: one task per layer per intent (an intent is a domain
// module — see the core definition's `{module}` placeholder). landing-page:
// one task per phase, no module axis. Both are the same operation — walk
// a core definition's layer chain once per intent — because a linear
// chain is the degenerate case of the layer graph (spec: MVP scope
// item 5).

function fillModule(template, module) {
  return template.replaceAll('{module}', module);
}

// Deterministic, human-legible task id: <INTENT>-<LAYER>, upper-cased.
// Stable across repeated `hedgehog plan` runs on the same intent/layer.
function taskId(intentId, layerId) {
  return `${intentId}-${layerId}`.toUpperCase();
}

// Compiles one intent's tasks + intra-intent dependencies (mirroring the
// core definition's layer order) without touching the database.
function compileIntentTasks(intent, core) {
  const module = intent.id;
  const tasks = core.layers.map((layer) => ({
    id: taskId(intent.id, layer.id),
    intent_id: intent.id,
    module,
    layer: layer.id,
    objective: `${layer.id} for ${module}`,
    scope_globs: JSON.stringify(layer.scope.map((g) => fillModule(g, module))),
    verify_command: fillModule(layer.verify, module),
    commit_message: fillModule(layer.commit, module),
    priority: intent.priority,
  }));

  const dependencies = [];
  for (const layer of core.layers) {
    if (!layer.depends_on) continue;
    dependencies.push({
      task_id: taskId(intent.id, layer.id),
      depends_on_task_id: taskId(intent.id, layer.depends_on),
    });
  }

  return { tasks, dependencies };
}

// Reads pending intents (status 'proposed' or 'planned' — not yet
// compiled into tasks) in dependency order: an intent is compiled only
// after every intent it depends_on. Intents with no ordering constraint
// between them compile in `priority, id` order.
function orderIntents(intents, intentDependencies) {
  const byId = new Map(intents.map((i) => [i.id, i]));
  const dependsOn = new Map(intents.map((i) => [i.id, []]));
  for (const { intent_id, depends_on_intent_id } of intentDependencies) {
    if (!dependsOn.has(intent_id)) continue;
    if (!byId.has(depends_on_intent_id)) continue;
    dependsOn.get(intent_id).push(depends_on_intent_id);
  }

  const ordered = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`intent_dependencies cycle detected at "${id}"`);
    }
    visiting.add(id);
    for (const depId of dependsOn.get(id) ?? []) visit(depId);
    visiting.delete(id);
    visited.add(id);
    ordered.push(byId.get(id));
  }

  const remaining = [...intents].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
  );
  for (const intent of remaining) visit(intent.id);

  return ordered;
}

const PENDING_INTENT_STATUSES = ['proposed', 'planned'];

function loadPendingIntents(db) {
  const placeholders = PENDING_INTENT_STATUSES.map(() => '?').join(',');
  return db
    .prepare(`SELECT * FROM intents WHERE status IN (${placeholders})`)
    .all(...PENDING_INTENT_STATUSES);
}

function loadIntentDependencies(db) {
  return db.prepare('SELECT * FROM intent_dependencies').all();
}

function taskExists(db, taskId) {
  return db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId) !== undefined;
}

const insertTask = (db) =>
  db.prepare(`
    INSERT INTO tasks
      (id, intent_id, module, layer, objective, scope_globs, verify_command,
       commit_message, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')
  `);

const insertDependency = (db) =>
  db.prepare(`
    INSERT OR IGNORE INTO dependencies (task_id, depends_on_task_id)
    VALUES (?, ?)
  `);

// Compiles every pending intent against `core` and writes tasks +
// dependencies to `db`. Idempotent per intent: an intent whose tasks
// already exist (by id) is skipped entirely, so re-running `hedgehog
// plan` after adding a new intent doesn't touch already-compiled ones.
//
// Cross-intent ordering: for each `intent_dependencies` edge (A depends
// on B), A's first task in layer order gets an extra `dependencies` row
// on B's last task in layer order — so A's chain cannot start until B's
// chain is entirely `complete`.
export function planTasks(db, core) {
  const intents = loadPendingIntents(db);
  const intentDependencies = loadIntentDependencies(db);
  const ordered = orderIntents(intents, intentDependencies);

  const dependsOnByIntent = new Map();
  for (const { intent_id, depends_on_intent_id } of intentDependencies) {
    if (!dependsOnByIntent.has(intent_id)) dependsOnByIntent.set(intent_id, []);
    dependsOnByIntent.get(intent_id).push(depends_on_intent_id);
  }

  const firstLayerId = core.layers[0].id;
  const lastLayerId = core.layers[core.layers.length - 1].id;

  const runInsert = insertTask(db);
  const runInsertDep = insertDependency(db);

  const compiledIntentIds = [];
  const skippedIntentIds = [];

  db.exec('BEGIN');
  try {
    for (const intent of ordered) {
      const firstTaskId = taskId(intent.id, firstLayerId);
      if (taskExists(db, firstTaskId)) {
        skippedIntentIds.push(intent.id);
        continue;
      }

      const { tasks, dependencies } = compileIntentTasks(intent, core);
      for (const t of tasks) {
        runInsert.run(
          t.id,
          t.intent_id,
          t.module,
          t.layer,
          t.objective,
          t.scope_globs,
          t.verify_command,
          t.commit_message,
          t.priority,
        );
      }
      for (const d of dependencies) {
        runInsertDep.run(d.task_id, d.depends_on_task_id);
      }

      // Cross-intent edge: this intent's first task can't be ready until
      // every intent it depends_on has its last task complete.
      for (const depIntentId of dependsOnByIntent.get(intent.id) ?? []) {
        const depLastTaskId = taskId(depIntentId, lastLayerId);
        runInsertDep.run(firstTaskId, depLastTaskId);
      }

      compiledIntentIds.push(intent.id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { compiled: compiledIntentIds, skipped: skippedIntentIds };
}
