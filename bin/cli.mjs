#!/usr/bin/env node
// Hedgehog installer. Copies the agents/skills payload and root templates
// into the current repo, so the discipline travels with the project.
//
// Usage:
//   npx @skyf0xx/hedgehog init                        no workspace yet — planner picks the core
//   npx @skyf0xx/hedgehog init --ts-full-stack-app     scaffold the full-stack-app core now
//   npx @skyf0xx/hedgehog init --landing-page          scaffold the landing-page core now
//   npx @skyf0xx/hedgehog init --force                 overwrite files that already exist
//   npx @skyf0xx/hedgehog update                       refresh .claude/agents + .claude/skills
//   npx @skyf0xx/hedgehog --help

import { cp, mkdir, access, readdir, stat, rm, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { dbInit, DB_PATH } from '../src/db/init.mjs';
import { loadCore } from '../src/db/core.mjs';
import { planTasks } from '../src/db/plan.mjs';
import { addIntent } from '../src/db/intent.mjs';
import { nextTask, formatNext, stalledTasks } from '../src/db/next.mjs';
import { verifyTask } from '../src/db/verify.mjs';
import { graphStatus, formatStatus } from '../src/db/status.mjs';
import { whyPath, formatWhy } from '../src/db/why.mjs';
import { addFriction, listFriction } from '../src/db/friction.mjs';

const AUTHORED_CORE_PATH = '.hedgehog/core.yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const DEST_ROOT = process.cwd();
const CORES_ROOT = join(PKG_ROOT, 'src/golden-cores');
const DEFAULT_CORE = 'full-stack-app';

// One install flag per core, named for what a user is asking to build
// rather than the internal src/golden-cores/<name> directory — the two
// diverge deliberately so the CLI's public surface can stay stable
// while cores are renamed or added underneath it. Adding a core means
// adding one entry here (and a matching src/golden-cores/<dir>).
const CORE_FLAGS = {
  '--ts-full-stack-app': 'full-stack-app',
  '--landing-page': 'landing-page',
};

// ── tiny ANSI helpers (no deps) ─────────────────────────────────────────
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (s) => paint('1', s);
const green = (s) => paint('32', s);
const yellow = (s) => paint('33', s);
const red = (s) => paint('31', s);
const dim = (s) => paint('2', s);

// npm strips files literally named `.gitignore` from published tarballs,
// even when the containing directory is listed in `files`. Stored under
// this name in the package, renamed back on copy.
const DOTFILE_RENAMES = { 'gitignore.template': '.gitignore' };

// Every subdirectory of src/golden-cores/ is a valid --core value —
// discovered from disk so a new core added under golden-cores/ doesn't
// need this list touched separately.
async function availableCores() {
  return (await readdir(CORES_ROOT, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// ── the payload: what gets copied, and to where under the target repo ───
// `dir` entries copy a whole tree; `file` entries copy a single file and
// may rename (templates lose their src/templates/ prefix at the root);
// `merge` entries concatenate a shared shell with a core-specific include
// at {{CORE_SECTION}} (see CLAUDE.md template plumbing below).
// Agents and skills for every core install regardless of which one is
// chosen — planner needs the full toolset to run core selection at all,
// and a project can only switch cores before it's bootstrapped anyway.
//
// `core` is `null` on a deferred install (plain `init`, no explicit
// flag): which core applies hasn't been decided yet, so nothing
// core-specific — no golden-core workspace, no filled CLAUDE.md section —
// gets written speculatively. `bootstrap` lands the real workspace, for
// whichever core `planner` picks, the first time either way. An explicit
// flag (`--ts-full-stack-app`, `--landing-page`) is a confirmed choice,
// not a guess, so it scaffolds immediately as before.
function plan(core) {
  const base = [
    { type: 'dir', from: 'src/agents', to: '.claude/agents' },
    { type: 'dir', from: 'src/skills', to: '.claude/skills' },
    // The vendored BMAD-METHOD planning shelf that hedgehog-planning-intake
    // runs — referenced by repo-root-relative path (skills/BMAD/...), so it
    // lands there rather than under .claude/.
    { type: 'dir', from: 'skills/BMAD', to: 'skills/BMAD' },
    // The vendored GSAP animation skill shelf that front-end-eng loads for
    // motion work — same repo-root-relative referencing as skills/BMAD.
    { type: 'dir', from: 'skills/GSAP', to: 'skills/GSAP' },
  ];

  if (core === null) {
    return [
      ...base,
      // The shell with its {{CORE_SECTION}} placeholder left unfilled —
      // whichever bootstrap-core skill runs first fills it in for the
      // core planner actually picked.
      { type: 'file', from: 'src/templates/CLAUDE.md', to: 'CLAUDE.md' },
    ];
  }

  return [
    ...base,
    {
      type: 'merge',
      shell: 'src/templates/CLAUDE.md',
      include: `src/templates/CLAUDE.core.${core}.md`,
      to: 'CLAUDE.md',
    },
    // The pre-built, pre-verified workspace for the chosen core —
    // everything a fresh project of that shape needs at repo root
    // (lands the root package.json too, so there's no separate
    // placeholder for it). The relevant bootstrap-core skill verifies
    // this on first run rather than generating it live.
    { type: 'dir', from: `src/golden-cores/${core}`, to: '.' },
  ];
}

// The subset of plan() that's the discipline's payload rather than
// project-specific or write-once content: `update` re-copies exactly
// this, always overwriting, since a consuming project's own
// .claude/agents and .claude/skills are supposed to match upstream
// verbatim. CLAUDE.md carries project-filled content, the build graph
// and core workspace are verified once by their own init/bootstrap-core
// steps, and skills/BMAD and skills/GSAP are re-vendored only
// deliberately (a manual re-vendor, per each shelf's ATTRIBUTION.md) —
// none of those belong in an update.
const UPDATE_PLAN = [
  { type: 'dir', from: 'src/agents', to: '.claude/agents' },
  { type: 'dir', from: 'src/skills', to: '.claude/skills' },
];

const exists = (p) =>
  access(p, constants.F_OK).then(
    () => true,
    () => false,
  );

// Writes one planned file to disk — a straight copy, or for a `merge`
// entry, the shell template with {{CORE_SECTION}} replaced by the
// chosen core's include.
async function writePlannedFile(f) {
  await mkdir(dirname(f.dest), { recursive: true });
  if (f.merge) {
    const shell = await readFile(join(PKG_ROOT, f.merge.shell), 'utf8');
    const section = await readFile(join(PKG_ROOT, f.merge.include), 'utf8');
    await writeFile(f.dest, shell.replaceAll('{{CORE_SECTION}}', section.trimEnd()));
    return;
  }
  await cp(f.src, f.dest);
}

// Every destination file this plan would write, resolved absolute.
async function plannedFiles(entry) {
  if (entry.type === 'merge') {
    return [{ dest: join(DEST_ROOT, entry.to), merge: entry }];
  }
  const src = join(PKG_ROOT, entry.from);
  if (entry.type === 'file') {
    return [{ src, dest: join(DEST_ROOT, entry.to) }];
  }
  const out = [];
  async function walk(rel) {
    const abs = join(src, rel);
    const st = await stat(abs);
    if (st.isDirectory()) {
      for (const name of await readdir(abs)) await walk(join(rel, name));
    } else {
      const renamed = DOTFILE_RENAMES[rel] ?? rel;
      out.push({ src: abs, dest: join(DEST_ROOT, entry.to, renamed) });
    }
  }
  await walk('.');
  return out;
}

async function help() {
  const cores = await availableCores();
  console.log(`
${bold('Hedgehog installer')}

Copies the Hedgehog agents and skills into ${bold('.claude/')}, drops the
CLAUDE.md template and an empty build graph (${bold('.hedgehog/hedgehog.db')})
into the repo root, so the discipline is committed alongside your code.

${bold('Usage')}
  npx @skyf0xx/hedgehog init                      no workspace yet — planner picks the core
  npx @skyf0xx/hedgehog init --ts-full-stack-app  scaffold the full-stack-app core now
  npx @skyf0xx/hedgehog init --landing-page       scaffold the landing-page core now
  npx @skyf0xx/hedgehog init --force              overwrite existing files
  npx @skyf0xx/hedgehog update                    refresh .claude/agents + .claude/skills
  npx @skyf0xx/hedgehog db init                   create .hedgehog/hedgehog.db if absent
  npx @skyf0xx/hedgehog plan                      compile pending intents into tasks + dependencies
  npx @skyf0xx/hedgehog intent add [flags]        add an intent (rules/requirements/dependencies)
  npx @skyf0xx/hedgehog intent add --file <path>  add an intent from a JSON file
  npx @skyf0xx/hedgehog next                      print the task packet for one ready task
  npx @skyf0xx/hedgehog verify <task-id>          run scope + verify checks, commit on pass
  npx @skyf0xx/hedgehog status                    graph overview: counts by status, ready list
  npx @skyf0xx/hedgehog why <path>                provenance chain for a file
  npx @skyf0xx/hedgehog friction add "<note>"     log a friction note [--task <task-id>]
  npx @skyf0xx/hedgehog friction list             list logged friction, oldest first
  npx @skyf0xx/hedgehog --help

Available cores: ${cores.join(', ')}

After it runs, commit the payload, open Claude Code, and describe what
you want to build — the planner agent runs planning intake, then hands
off to bootstrap.

Building something else (a CLI, library, browser extension, data
pipeline, desktop app, etc.)? Run plain 'init' with no core flag rather
than picking --ts-full-stack-app or --landing-page by elimination — it
installs the agents, skills, and build graph only, nothing core-specific.
The planner agent designs a core at planning intake (hedgehog-core-design)
and bootstrap generates that workspace once it's confirmed. Describe the
actual project and let Phase 0 route it.

${bold('update')} re-copies only .claude/agents and .claude/skills from the
installed Hedgehog version, so an already-bootstrapped project can pick up
agent/skill changes from a newer release. It always overwrites those two
directories and never touches CLAUDE.md, the build graph, the core
workspace, or skills/BMAD and skills/GSAP — those are project-specific or
updated deliberately, not by this command.
`);
}

async function init({ force, core, explicitCore }) {
  if (explicitCore) {
    const cores = await availableCores();
    if (!cores.includes(core)) {
      console.error(
        `${red('Unknown core:')} ${core}\n\nAvailable cores: ${cores.join(', ')}\n`,
      );
      process.exitCode = 1;
      return;
    }
  }

  // Resolve the full list of writes up front so we can detect conflicts
  // before touching anything. A deferred install (no explicit core) plans
  // against `null` — no golden-core workspace, nothing core-specific.
  const groups = [];
  for (const entry of plan(explicitCore ? core : null)) {
    const files = await plannedFiles(entry);
    groups.push({ entry, files });
  }

  const conflicts = [];
  for (const { files } of groups) {
    for (const f of files) {
      if (await exists(f.dest)) conflicts.push(f.dest);
    }
  }

  if (conflicts.length && !force) {
    console.error(`\n${red(bold('Refusing to overwrite existing files.'))}\n`);
    for (const c of conflicts) {
      console.error(`  ${yellow('exists')}  ${relative(DEST_ROOT, c) || c}`);
    }
    console.error(
      `\nRe-run with ${bold('--force')} to overwrite, or move these aside first.\n`,
    );
    process.exitCode = 1;
    return;
  }

  let written = 0;
  let overwritten = 0;
  for (const { files } of groups) {
    for (const f of files) {
      const already = await exists(f.dest);
      await writePlannedFile(f);
      if (already) overwritten++;
      else written++;
      const label = already ? yellow('overwrite') : green('create');
      console.log(`  ${label}  ${relative(DEST_ROOT, f.dest)}`);
    }
  }

  const { created: dbCreated, path: dbPath } = await dbInit(DB_PATH);
  console.log(`  ${dbCreated ? green('create') : dim('exists')}  ${dbPath}`);
  if (dbCreated) written++;

  console.log(
    `\n${green(bold('Hedgehog installed.'))} ${dim(
      `${written} created${overwritten ? `, ${overwritten} overwritten` : ''}`,
    )}\n`,
  );
  console.log('Next steps:');
  if (explicitCore) {
    console.log(`  1. ${bold('git add -A && git commit -m "chore: install Hedgehog"')}`);
    console.log(`  2. ${bold('pnpm install')}`);
    console.log(`  3. Open Claude Code and describe what you want to build.`);
  } else {
    console.log(`  1. ${bold('git add -A && git commit -m "chore: install Hedgehog"')}`);
    console.log(`  2. Open Claude Code and describe what you want to build.`);
  }
  console.log(
    dim(
      `     The ${bold('planner')} agent runs planning intake, then hands off to bootstrap.`,
    ),
  );
  console.log();
  if (explicitCore) {
    console.log(dim(`Core: ${bold(core)}.`));
    console.log(
      dim(
        core === DEFAULT_CORE
          ? '(Nx, packages/config, packages/db, apps/api, apps/web) — bootstrap\n' +
              'runs whichever add-ons (Auth, Queue, Mobile) intake calls for.'
          : 'bootstrap runs whichever add-on steps this core defines, if any.',
      ),
    );
  } else {
    console.log(
      dim(
        'Core: not chosen yet. Nothing core-specific landed — no workspace,\n' +
          'no framework, no lockfile. planner decides which core applies at\n' +
          'planning intake, then bootstrap lands that core\'s workspace for\n' +
          'the first time.',
      ),
    );
  }
}

async function update() {
  // Full replace, not a merge: clear each destination dir first so a
  // rename or removal upstream (e.g. an agent renamed between releases)
  // doesn't leave a stale file sitting alongside the new one.
  for (const entry of UPDATE_PLAN) {
    await rm(join(DEST_ROOT, entry.to), { recursive: true, force: true });
  }

  let written = 0;
  for (const entry of UPDATE_PLAN) {
    const files = await plannedFiles(entry);
    for (const f of files) {
      await mkdir(dirname(f.dest), { recursive: true });
      await cp(f.src, f.dest);
      written++;
      console.log(`  ${green('update')}  ${relative(DEST_ROOT, f.dest)}`);
    }
  }

  console.log(
    `\n${green(bold('Hedgehog agents/skills updated.'))} ${dim(`${written} files written`)}\n`,
  );
  console.log('Next steps:');
  console.log(`  1. ${bold('git diff .claude/')} to review what changed`);
  console.log(`  2. ${bold('git add -A && git commit -m "chore: update hedgehog"')}\n`);
  console.log(
    dim(
      'CLAUDE.md, the build graph, the core workspace, and skills/BMAD\n' +
        'and skills/GSAP are untouched — those carry project-specific or\n' +
        'write-once content.',
    ),
  );
}

async function dbCommand(args) {
  const sub = args[0];
  if (sub !== 'init') {
    console.error(`${red('Unknown db subcommand:')} ${sub ?? '(none)'}\n\nUsage: hedgehog db init\n`);
    process.exitCode = 1;
    return;
  }
  const { created, path } = await dbInit(DB_PATH);
  console.log(
    created
      ? `  ${green('create')}  ${path}`
      : `  ${dim('exists')}  ${path} ${dim('(no-op)')}`,
  );
}

// Resolves the project's core definition: an authored .hedgehog/core.yaml
// takes precedence (spec: "Authored cores"); otherwise the shipped Golden
// Core landed at repo root by `bootstrap` (its core.yaml copies there
// along with the rest of src/golden-cores/<core>). Neither exists yet on
// a deferred install (plain `init`, no explicit core flag) until
// `bootstrap` runs — this returns null until then.
async function resolveCorePath() {
  if (await exists(join(DEST_ROOT, AUTHORED_CORE_PATH))) {
    return join(DEST_ROOT, AUTHORED_CORE_PATH);
  }
  const rootCore = join(DEST_ROOT, 'core.yaml');
  if (await exists(rootCore)) return rootCore;
  return null;
}

async function planCommand() {
  const corePath = await resolveCorePath();
  if (!corePath) {
    console.error(
      `${red('No core definition found.')} Expected ${bold(AUTHORED_CORE_PATH)} or a root ${bold('core.yaml')} (from \`hedgehog init\`).\n`,
    );
    process.exitCode = 1;
    return;
  }

  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  const core = await loadCore(corePath);
  const db = new DatabaseSync(DB_PATH);
  let result;
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    result = planTasks(db, core);
  } finally {
    db.close();
  }

  for (const id of result.compiled) console.log(`  ${green('compiled')}  ${id}`);
  for (const id of result.skipped) console.log(`  ${dim('skipped')}  ${id} ${dim('(already compiled)')}`);
  console.log(
    `\n${green(bold('Plan complete.'))} ${dim(`${result.compiled.length} intent(s) compiled, ${result.skipped.length} skipped`)}\n`,
  );
}

// Parses `hedgehog intent add` args into the same record shape
// src/db/intent.mjs#normalizeIntent expects. Two sources: `--file <path>`
// (a JSON file matching the intent record shape verbatim), or flags —
// `--id`, `--goal`, `--outcome`, `--priority`, repeatable `--rule`
// / `--constraint` / `--acceptance` / `--depends-on`. Mixing the two
// is rejected: one intent, one unambiguous source.
async function parseIntentArgs(args) {
  const fileIdx = args.indexOf('--file');
  const hasFlags = args.some((a) => a.startsWith('--') && a !== '--file');

  if (fileIdx !== -1) {
    if (hasFlags) {
      throw new Error('--file cannot be combined with other intent flags');
    }
    const filePath = args[fileIdx + 1];
    if (!filePath) throw new Error('--file requires a path');
    const text = await readFile(resolve(DEST_ROOT, filePath), 'utf8');
    return JSON.parse(text);
  }

  const record = { rules: [], constraints: [], acceptance: [], depends_on: [] };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];
    switch (flag) {
      case '--id':
        record.id = value;
        i++;
        break;
      case '--goal':
        record.goal = value;
        i++;
        break;
      case '--outcome':
        record.outcome = value;
        i++;
        break;
      case '--priority':
        record.priority = Number(value);
        i++;
        break;
      case '--rule':
        record.rules.push(value);
        i++;
        break;
      case '--constraint':
        record.constraints.push(value);
        i++;
        break;
      case '--acceptance':
        record.acceptance.push(value);
        i++;
        break;
      case '--depends-on':
        record.depends_on.push(value);
        i++;
        break;
      default:
        throw new Error(`Unknown intent flag: ${flag}`);
    }
  }
  return record;
}

async function intentCommand(args) {
  const sub = args[0];
  if (sub !== 'add') {
    console.error(
      `${red('Unknown intent subcommand:')} ${sub ?? '(none)'}\n\nUsage: hedgehog intent add --id <id> --goal <goal> --outcome <outcome> [--rule <r>]... [--depends-on <id>]...\n   or: hedgehog intent add --file <path.json>\n`,
    );
    process.exitCode = 1;
    return;
  }

  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  let record;
  try {
    record = await parseIntentArgs(args.slice(1));
  } catch (err) {
    console.error(`${red('Invalid arguments:')} ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const db = new DatabaseSync(DB_PATH);
  let intent;
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    intent = addIntent(db, record);
  } catch (err) {
    console.error(`${red('Failed to add intent:')} ${err.message}\n`);
    process.exitCode = 1;
    return;
  } finally {
    db.close();
  }

  console.log(`  ${green('added')}  ${intent.id}`);
  console.log(`  ${dim(`${intent.requirements.length} requirement(s), ${intent.depends_on.length} dependency(ies)`)}`);
}

async function nextCommand() {
  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  const db = new DatabaseSync(DB_PATH);
  let packet;
  let stalled = [];
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    packet = nextTask(db);
    if (!packet) stalled = stalledTasks(db);
  } finally {
    db.close();
  }

  if (!packet) {
    // A stalled task is not pickable, so without naming it here "no ready
    // task" reads identically whether the build is finished or wedged on
    // a failed verification.
    if (stalled.length > 0) {
      console.error(`${red(bold('No ready task, but the graph is blocked.'))}\n`);
      for (const task of stalled) {
        const reason =
          task.status === 'failed' ? 'verification failed' : 'scope violation';
        console.error(`  ${red('✗')} ${bold(task.id)}   ${task.layer}   ${dim(reason)}`);
      }
      console.error(
        `\nFix the work, then re-run ${bold('hedgehog verify <task-id>')}.\n`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(`${dim('No ready task.')} Nothing is planned with all dependencies complete.\n`);
    return;
  }

  console.log(formatNext(packet));
}

async function verifyCommand(args) {
  const taskId = args[0];
  if (!taskId) {
    console.error(`${red('Usage:')} hedgehog verify <task-id>\n`);
    process.exitCode = 1;
    return;
  }

  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  const db = new DatabaseSync(DB_PATH);
  let result;
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    result = verifyTask(db, taskId);
  } catch (err) {
    console.error(`${red('Verify failed:')} ${err.message}\n`);
    process.exitCode = 1;
    return;
  } finally {
    db.close();
  }

  if (result.outcome === 'scope_violation') {
    console.error(`${red(bold('Scope violation.'))} Task ${bold(taskId)} stays ${bold('implemented')}.\n`);
    console.error('Touched paths outside allowed scope:');
    for (const path of result.offending) console.error(`  ${red('✗')} ${path}`);
    console.error();
    process.exitCode = 1;
    return;
  }

  if (result.outcome === 'failed') {
    console.error(`${red(bold('Verification failed.'))} Task ${bold(taskId)} is now ${bold('failed')} (exit ${result.exitCode}).\n`);
    if (result.output) console.error(result.output);
    process.exitCode = 1;
    return;
  }

  console.log(`${green(bold('Verified.'))} Task ${bold(taskId)} is now ${bold('complete')}.`);
  if (result.commitSha) console.log(`  ${dim('commit')}  ${result.commitSha}`);
  if (result.unlocked.length === 0) {
    console.log(`  ${dim('no dependents unlocked')}`);
  } else {
    for (const id of result.unlocked) console.log(`  ${green('ready')}  ${id}`);
  }
  if (result.intentComplete) {
    console.log(`  ${green('intent complete')}  ${dim('every task for this intent is done')}`);
  }
}

async function statusCommand() {
  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  const db = new DatabaseSync(DB_PATH);
  let result;
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    result = graphStatus(db);
  } finally {
    db.close();
  }

  console.log(formatStatus(result));
}

async function whyCommand(args) {
  const path = args[0];
  if (!path) {
    console.error(`${red('Usage:')} hedgehog why <path>\n`);
    process.exitCode = 1;
    return;
  }

  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  const db = new DatabaseSync(DB_PATH);
  let chain;
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    chain = whyPath(db, path);
  } finally {
    db.close();
  }

  console.log(formatWhy(path, chain));
}

async function frictionCommand(args) {
  const sub = args[0];

  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  if (sub === 'add') {
    // Split `--task <id>` out of the note words by index, not by value —
    // filtering on the *value* dropped the flag but kept its argument in
    // the note (and would mangle a note that legitimately contains the
    // word "--task").
    const rest = args.slice(1);
    const taskIdx = rest.indexOf('--task');
    const taskId = taskIdx !== -1 ? rest[taskIdx + 1] : undefined;
    if (taskIdx !== -1 && !taskId) {
      console.error(`${red('--task requires a task id')}\n`);
      process.exitCode = 1;
      return;
    }
    const note = rest
      .filter((_, i) => taskIdx === -1 || (i !== taskIdx && i !== taskIdx + 1))
      .join(' ');
    if (!note) {
      console.error(`${red('Usage:')} hedgehog friction add "<note>" [--task <task-id>]\n`);
      process.exitCode = 1;
      return;
    }

    const db = new DatabaseSync(DB_PATH);
    let entry;
    try {
      db.exec('PRAGMA foreign_keys = ON;');
      entry = addFriction(db, { note, taskId });
    } catch (err) {
      console.error(`${red('Failed to log friction:')} ${err.message}\n`);
      process.exitCode = 1;
      return;
    } finally {
      db.close();
    }

    console.log(`  ${green('logged')}  #${entry.id}${entry.taskId ? ` (${entry.taskId})` : ''}`);
    return;
  }

  if (sub === 'list') {
    const db = new DatabaseSync(DB_PATH);
    let entries;
    try {
      db.exec('PRAGMA foreign_keys = ON;');
      entries = listFriction(db);
    } finally {
      db.close();
    }

    if (entries.length === 0) {
      console.log(`${dim('No friction logged.')}\n`);
      return;
    }
    for (const entry of entries) {
      console.log(`#${entry.id}  ${dim(entry.loggedAt)}${entry.taskId ? `  ${bold(entry.taskId)}` : ''}`);
      console.log(`  ${entry.note}\n`);
    }
    return;
  }

  console.error(
    `${red('Unknown friction subcommand:')} ${sub ?? '(none)'}\n\nUsage: hedgehog friction add "<note>" [--task <task-id>]\n   or: hedgehog friction list\n`,
  );
  process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    await help();
    return;
  }
  const cmd = args[0];
  const force = args.includes('--force') || args.includes('-f');
  const coreFlag = args.find((a) => a in CORE_FLAGS);
  if (coreFlag === undefined && args.some((a) => a.startsWith('--core='))) {
    const attempted = args.find((a) => a.startsWith('--core='));
    console.error(
      `${red('Unknown flag:')} ${attempted}\n\n` +
        `Use an explicit core flag instead: ${Object.keys(CORE_FLAGS).join(', ')}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const core = coreFlag ? CORE_FLAGS[coreFlag] : DEFAULT_CORE;

  if (cmd === 'init') {
    await init({ force, core, explicitCore: Boolean(coreFlag) });
    return;
  }

  if (cmd === 'update') {
    await update();
    return;
  }

  if (cmd === 'db') {
    await dbCommand(args.slice(1));
    return;
  }

  if (cmd === 'plan') {
    await planCommand();
    return;
  }

  if (cmd === 'intent') {
    await intentCommand(args.slice(1));
    return;
  }

  if (cmd === 'next') {
    await nextCommand();
    return;
  }

  if (cmd === 'verify') {
    await verifyCommand(args.slice(1));
    return;
  }

  if (cmd === 'status') {
    await statusCommand();
    return;
  }

  if (cmd === 'why') {
    await whyCommand(args.slice(1));
    return;
  }

  if (cmd === 'friction') {
    await frictionCommand(args.slice(1));
    return;
  }

  console.error(`${red('Unknown command:')} ${cmd}\n`);
  await help();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\n${red(bold('Install failed:'))} ${err.message}\n`);
  process.exitCode = 1;
});
