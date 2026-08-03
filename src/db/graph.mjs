// `hedgehog graph` — read-only dependency-graph export for the build
// graph: every task as a node, every `dependencies` row as an edge. See
// hedgehog-persistent-build-graph.md, "Schema", for the `tasks` and
// `dependencies` tables this mirrors.
//
// This module only shapes rows into { nodes, edges }; layout and
// rendering live in graph-viewer.mjs's HTML template, not here — the
// same separation status.mjs keeps between graphStatus() (data) and
// formatStatus() (text rendering).

const ALL_TASKS_SQL = `
  SELECT t.*, i.goal AS intent_goal FROM tasks t
  JOIN intents i ON i.id = t.intent_id
  ORDER BY t.priority, t.id;
`;

const ALL_DEPENDENCIES_SQL = `
  SELECT task_id, depends_on_task_id FROM dependencies;
`;

function loadAllTasks(db) {
  return db.prepare(ALL_TASKS_SQL).all();
}

function loadAllDependencies(db) {
  return db.prepare(ALL_DEPENDENCIES_SQL).all();
}

// Shapes the full build graph into { nodes, edges } for the viewer.
// Each node carries exactly the fields the viewer displays on click
// (objective, verify_command, commit_message) plus the fields that drive
// layout and status colour — nothing the viewer doesn't render.
export function buildGraph(db) {
  const tasks = loadAllTasks(db);
  const dependencies = loadAllDependencies(db);

  const nodes = tasks.map((t) => ({
    id: t.id,
    module: t.module,
    layer: t.layer,
    status: t.status,
    objective: t.objective,
    verifyCommand: t.verify_command,
    commitMessage: t.commit_message,
    intentGoal: t.intent_goal,
  }));

  // Edge direction follows the dependency, not the SQL column order:
  // `depends_on_task_id` must finish before `task_id` can start, so the
  // arrow is drawn from the prerequisite to the dependent — the same
  // direction hedgehog next's BLOCKED DOWNSTREAM walk assumes.
  const edges = dependencies.map((d) => ({
    id: `${d.depends_on_task_id}->${d.task_id}`,
    source: d.depends_on_task_id,
    target: d.task_id,
  }));

  return { nodes, edges };
}
