// The Hedgehog build graph schema — see hedgehog-persistent-build-graph.md,
// "SQLite as build state" → Schema, for the source of truth these table
// definitions mirror verbatim.

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS intents (
  id          TEXT PRIMARY KEY,
  goal        TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 100,
  status      TEXT NOT NULL DEFAULT 'proposed'
              CHECK (status IN ('proposed','planned','active','complete')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requirements (
  id          TEXT PRIMARY KEY,
  intent_id   TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('rule','constraint','acceptance')),
  statement   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intent_dependencies (
  intent_id            TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  depends_on_intent_id TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  PRIMARY KEY (intent_id, depends_on_intent_id),
  CHECK (intent_id <> depends_on_intent_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  intent_id      TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  module         TEXT NOT NULL,
  layer          TEXT NOT NULL,
  objective      TEXT NOT NULL,
  scope_globs    TEXT NOT NULL,
  verify_command TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  priority       INTEGER NOT NULL DEFAULT 100,
  status         TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed','planned','ready','in_progress',
                                   'implemented','verifying','verified',
                                   'complete','failed')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_requirements (
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, requirement_id)
);

CREATE TABLE IF NOT EXISTS dependencies (
  task_id            TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS artifacts (
  id        INTEGER PRIMARY KEY,
  task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  path      TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('created','modified')),
  commit_sha TEXT
);

CREATE TABLE IF NOT EXISTS verifications (
  id         INTEGER PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  command    TEXT NOT NULL,
  exit_code  INTEGER,
  output     TEXT,
  status     TEXT NOT NULL CHECK (status IN ('passed','failed')),
  ran_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS friction (
  id        INTEGER PRIMARY KEY,
  task_id   TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  note      TEXT NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Applies the schema to an already-open node:sqlite DatabaseSync instance.
// Idempotent: safe to call against a DB that already has these tables.
export function applySchema(db) {
  db.exec(SCHEMA_SQL);
}
