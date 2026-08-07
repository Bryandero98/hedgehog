// `hedgehog verify <task-id>` — scope pre-check, then verify_command, then
// state transition. See hedgehog-persistent-build-graph.md, "Task
// lifecycle", "`hedgehog verify`", and "Scope enforcement is a hard
// pre-verification check".
//
// Two gates, in order:
//   1. `git diff --name-only` (working tree) against the task's
//      scope_globs. Any touched path outside scope refuses to run
//      verification at all — the task stays `implemented`, no
//      `verifications` row written. This is a scope violation, not a
//      failing check.
//   2. Only once every touched path matches scope does verify_command run.
//      Exit 0: verifications row (passed) → verified → artifacts recorded
//      → git commit with commit_message → complete → direct dependents
//      re-evaluated (a dependent is ready once every dependency is
//      complete — same check as the readiness SELECT in next.mjs).
//      Nonzero: verifications row (failed, output retained) → failed,
//      dependents stay blocked.
//
// No subprocess (git, verify_command) ever runs while a sqlite
// transaction is open: every execSync call in this file happens before
// BEGIN or after COMMIT, never between them.

import { execSync } from 'node:child_process';
import { DB_PATH } from './init.mjs';

// The build graph file itself is engine state, written only by this CLI,
// never by an agent — it's excluded from every task's scope check (and
// from artifacts/commits), or verify's own writes ahead of the
// verify_command run would trip the very check it's performing. Covers
// SQLite's journal/WAL/SHM sidecar files too.
function isEngineStatePath(path) {
  return path === DB_PATH || path.startsWith(`${DB_PATH}-`);
}

// Shell-safe quoting for paths interpolated into a git command line,
// matching the JSON.stringify(path) convention used elsewhere in this
// file for the same purpose.
function quotePathspec(path) {
  return JSON.stringify(path);
}

// Working-tree diff (relative paths), optionally restricted to `pathspecs`
// via git's own pathspec matching (e.g. `:(glob)packages/db/src/schema/**`)
// — covers modified, added, deleted, and untracked files, everything the
// agent could have touched.
function changedPaths(pathspecs) {
  const scopeArgs = pathspecs ? ` -- ${pathspecs.map(quotePathspec).join(' ')}` : '';
  const tracked = execSync(`git diff --name-only HEAD${scopeArgs}`, { encoding: 'utf8' });
  const untracked = execSync(
    `git ls-files --others --exclude-standard${scopeArgs}`,
    { encoding: 'utf8' },
  );
  const paths = new Set(
    [...tracked.split('\n'), ...untracked.split('\n')].map((p) => p.trim()).filter(Boolean),
  );
  return [...paths].filter((p) => !isEngineStatePath(p));
}

// Paths touched outside `scopeGlobs`: the full changed set minus the same
// query re-run with the globs applied as git pathspec magic. Git's own
// matcher handles `**` correctly, so no hand-rolled glob→regex is needed.
function offendingPaths(touched, scopeGlobs) {
  const pathspecs = scopeGlobs.map((glob) => `:(glob)${glob}`);
  const inScope = new Set(changedPaths(pathspecs));
  return touched.filter((path) => !inScope.has(path));
}

function loadTask(db, taskId) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
}

function setTaskStatus(db, taskId, status) {
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId);
}

const insertVerification = (db) =>
  db.prepare(`
    INSERT INTO verifications (task_id, command, exit_code, output, status)
    VALUES (?, ?, ?, ?, ?)
  `);

const insertArtifact = (db) =>
  db.prepare(`
    INSERT INTO artifacts (task_id, path, kind, commit_sha)
    VALUES (?, ?, ?, ?)
  `);

// Direct dependents of `taskId` — same shape as next.mjs's
// loadDirectDependents, kept local since verify.mjs owns the write side
// and next.mjs owns the read side of the same query.
function loadDirectDependents(db, taskId) {
  return db
    .prepare(
      `
      SELECT t.* FROM tasks t
      JOIN dependencies d ON d.task_id = t.id
      WHERE d.depends_on_task_id = ?
      ORDER BY t.priority, t.id
    `,
    )
    .all(taskId);
}

// True when every dependency of `taskId` is `complete` — the same
// condition the readiness SELECT in next.mjs checks, reused here so a
// dependent is only ever unlocked by the one rule the engine has for
// readiness.
function hasNoIncompleteDependency(db, taskId) {
  const blocker = db
    .prepare(
      `
      SELECT 1 FROM dependencies d
      JOIN tasks dep ON dep.id = d.depends_on_task_id
      WHERE d.task_id = ? AND dep.status <> 'complete'
    `,
    )
    .get(taskId);
  return blocker === undefined;
}

// Marks `taskId`'s direct dependents `ready` wherever every one of their
// dependencies (not just this one) is now `complete` — but only if the
// dependent is still `planned`. A dependent already `failed` or
// `implemented` is stalled, not blocked-on-deps, and must not be silently
// cleared back to `ready` just because its deps happened to complete.
function unlockReadyDependents(db, taskId) {
  const unlocked = [];
  for (const dependent of loadDirectDependents(db, taskId)) {
    if (dependent.status !== 'planned') continue;
    if (hasNoIncompleteDependency(db, dependent.id)) {
      setTaskStatus(db, dependent.id, 'ready');
      unlocked.push(dependent.id);
    }
  }
  return unlocked;
}

// Marks `intentId` complete once every task compiled from it is
// `complete`. Completion is terminal bookkeeping, not a cleanup trigger
// (spec: "Traceability") — the intent's tasks, verifications, and
// artifacts stay exactly where they are as the provenance trail; the
// status change only stops `hedgehog plan` from treating it as pending
// and lets `status`/`next` report the intent honestly.
function completeIntentIfDone(db, intentId) {
  const openTask = db
    .prepare(
      "SELECT 1 FROM tasks WHERE intent_id = ? AND status <> 'complete'",
    )
    .get(intentId);
  if (openTask !== undefined) return false;
  db.prepare("UPDATE intents SET status = 'complete' WHERE id = ?").run(intentId);
  return true;
}

// Runs `command` via the shell, capturing combined stdout+stderr and exit
// code without throwing on nonzero exit — a failing verify_command is an
// expected outcome, not a Node exception.
function runVerifyCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { exitCode: 0, output };
  } catch (err) {
    const output = `${err.stdout ?? ''}${err.stderr ?? ''}` || err.message;
    return { exitCode: err.status ?? 1, output };
  }
}

// Classifies each of `paths` as 'created' or 'modified' against HEAD with
// a single `git ls-tree` call rather than one `git cat-file` subprocess
// per path: anything ls-tree reports already existed in HEAD.
function classifyArtifacts(paths) {
  if (paths.length === 0) return new Map();
  const quoted = paths.map(quotePathspec).join(' ');
  const output = execSync(`git ls-tree -r --name-only HEAD -- ${quoted}`, {
    encoding: 'utf8',
  });
  const existing = new Set(output.split('\n').map((p) => p.trim()).filter(Boolean));
  return new Map(paths.map((path) => [path, existing.has(path) ? 'modified' : 'created']));
}

// Determines created vs modified against HEAD, then stages and commits
// exactly the task's touched paths with commit_message. Returns the new
// commit sha.
//
// The build graph is committed in the same commit as the work it
// describes. The spec's "SQLite as build state" requires the DB be
// committed to git — that's what makes state survive `/clear`, machine
// moves, and reclone. The DB is excluded from the *scope check* (it's
// engine state, not agent output — see isEngineStatePath) but the commit
// this function makes is the task's final commit; nothing amends it
// afterward.
function commitTouchedPaths(paths, commitMessage) {
  const quoted = paths.map(quotePathspec).join(' ');
  execSync(`git add -- ${quoted}`, { stdio: 'pipe' });
  execSync(`git commit -m ${JSON.stringify(commitMessage)}`, { stdio: 'pipe' });
  return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
}

// Runs the full verify flow for `taskId`. Returns a result object
// describing what happened:
//   { outcome: 'scope_violation', offending: [...] }
//   { outcome: 'failed', exitCode, output }
//   { outcome: 'complete', exitCode, output, commitSha, unlocked: [...] }
export function verifyTask(db, taskId) {
  const task = loadTask(db, taskId);
  if (!task) throw new Error(`no such task: ${taskId}`);

  const scopeGlobs = JSON.parse(task.scope_globs);
  const touched = changedPaths();
  const offending = offendingPaths(touched, scopeGlobs);

  if (offending.length > 0) {
    setTaskStatus(db, task.id, 'implemented');
    return { outcome: 'scope_violation', offending };
  }

  const { exitCode, output } = runVerifyCommand(task.verify_command);

  if (exitCode !== 0) {
    db.exec('BEGIN IMMEDIATE');
    try {
      insertVerification(db).run(task.id, task.verify_command, exitCode, output, 'failed');
      setTaskStatus(db, task.id, 'failed');
      db.exec('COMMIT');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Rollback failing must not mask the original error.
      }
      throw err;
    }
    return { outcome: 'failed', exitCode, output };
  }

  // Artifact classification and the git commit both run subprocesses, so
  // both happen here, before the DB transaction opens — nothing inside
  // BEGIN/COMMIT below is anything but a sqlite statement.
  const kindByPath = classifyArtifacts(touched);
  const commitSha = touched.length > 0 ? commitTouchedPaths(touched, task.commit_message) : null;

  let unlocked;
  let intentComplete;
  db.exec('BEGIN IMMEDIATE');
  try {
    insertVerification(db).run(task.id, task.verify_command, exitCode, output, 'passed');
    setTaskStatus(db, task.id, 'verified');

    const runInsertArtifact = insertArtifact(db);
    for (const path of touched) {
      runInsertArtifact.run(task.id, path, kindByPath.get(path), commitSha);
    }

    setTaskStatus(db, task.id, 'complete');
    unlocked = unlockReadyDependents(db, task.id);
    intentComplete = completeIntentIfDone(db, task.intent_id);

    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Rollback failing must not mask the original error.
    }
    throw err;
  }

  return { outcome: 'complete', exitCode, output, commitSha, unlocked, intentComplete };
}
