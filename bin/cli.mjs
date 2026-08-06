#!/usr/bin/env node
// Hedgehog installer. Copies the agents/skills payload and root templates
// into the current repo, so the discipline travels with the project.
//
// Usage:
//   npx @skyf0xx/hedgehog init                        install; planner picks the core at intake
//   npx @skyf0xx/hedgehog init --ts-full-stack-app     scaffold the full-stack-app core now
//   npx @skyf0xx/hedgehog init --landing-page          scaffold the landing-page core now
//   npx @skyf0xx/hedgehog init --cursor                install for Cursor (default: Claude Code)
//   npx @skyf0xx/hedgehog init --all-hosts             install for every supported coding agent
//   npx @skyf0xx/hedgehog init --force                 overwrite files that already exist
//   npx @skyf0xx/hedgehog update                       refresh the installed agents + skills
//   npx @skyf0xx/hedgehog --help

import { cp, mkdir, access, readdir, stat, rm, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { dbInit, DB_PATH } from '../src/db/init.mjs';
import { loadCore } from '../src/db/core.mjs';
import { planTasks } from '../src/db/plan.mjs';
import { addIntent } from '../src/db/intent.mjs';
import { nextTask, formatNext, stalledTasks } from '../src/db/next.mjs';
import { verifyTask } from '../src/db/verify.mjs';
import { graphStatus, formatStatus } from '../src/db/status.mjs';
import { whyPath, formatWhy } from '../src/db/why.mjs';
import { addFriction, listFriction } from '../src/db/friction.mjs';
import { HOSTS, HOST_FLAGS, DEFAULT_HOST, availableHosts } from '../src/hosts/index.mjs';
import { recordHosts, installedHosts } from '../src/hosts/installed.mjs';

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
// flag): the payload is the shared agents/skills/build-graph only, with
// which core applies left for `planner` to decide. `bootstrap` lands the
// golden-core workspace and fills the CLAUDE.md section for whichever
// core `planner` picks — the first time either way. An explicit flag
// (`--ts-full-stack-app`, `--landing-page`) is a confirmed choice, so it
// scaffolds that workspace immediately, at install time.
// `hostOnly` plans just the parts that differ per host — used when a
// second host is added to a project whose shared payload (the vendored
// shelves, the core workspace) is already on disk.
function plan(core, host = DEFAULT_HOST, { hostOnly = false } = {}) {
  const h = HOSTS[host];
  const perHost = [
    { type: 'dir', from: 'src/agents', to: h.agentsDir, emit: h.emitAgent },
    { type: 'dir', from: 'src/skills', to: h.skillsDir },
    // Whatever else this host needs to find the payload — its own rules
    // file, extension manifest, or routing doc. Empty for a host that
    // auto-loads its bootstrap file and registers agents from disk.
    ...(h.extraEntries ?? []),
  ];

  // Host-independent: one copy per project however many hosts read it.
  const shared = hostOnly
    ? []
    : [
        // The vendored BMAD-METHOD planning shelf that
        // hedgehog-planning-intake runs — referenced by repo-root-relative
        // path (vendor-skills/BMAD/...), so it lands there rather than under
        // a host's own directory.
        { type: 'dir', from: 'vendor-skills/BMAD', to: 'vendor-skills/BMAD' },
        // The vendored GSAP animation skill shelf that front-end-eng loads
        // for motion work — same repo-root-relative referencing.
        { type: 'dir', from: 'vendor-skills/GSAP', to: 'vendor-skills/GSAP' },
      ];

  const base = [...perHost, ...shared];

  if (core === null) {
    return [
      ...base,
      // The shell with its {{CORE_SECTION}} placeholder left unfilled —
      // whichever bootstrap-core skill runs first fills it in for the
      // core planner actually picked. {{HOST_DISPATCH}} is filled now:
      // which host this is doesn't depend on the core.
      {
        type: 'merge',
        shell: 'src/templates/CLAUDE.md',
        dispatch: `src/hosts/${host}/DISPATCH.md`,
        to: h.bootstrapFile,
      },
    ];
  }

  return [
    ...base,
    {
      type: 'merge',
      shell: 'src/templates/CLAUDE.md',
      include: `src/templates/CLAUDE.core.${core}.md`,
      dispatch: `src/hosts/${host}/DISPATCH.md`,
      to: h.bootstrapFile,
    },
    // The pre-built, pre-verified workspace for the chosen core —
    // everything a fresh project of that shape needs at repo root
    // (lands the root package.json too, so there's no separate
    // placeholder for it). The relevant bootstrap-core skill verifies
    // this on first run rather than generating it live.
    ...(hostOnly ? [] : [{ type: 'dir', from: `src/golden-cores/${core}`, to: '.' }]),
  ];
}

// The subset of plan() that's the discipline's payload rather than
// project-specific or write-once content: `update` re-copies exactly
// this, always overwriting, since a consuming project's installed agents
// and skills are supposed to match upstream verbatim. The bootstrap file
// carries project-filled content, the build graph and core workspace are
// verified once by their own init/bootstrap-core steps, and
// vendor-skills/BMAD and vendor-skills/GSAP are re-vendored only
// deliberately (a manual re-vendor,
// per each shelf's ATTRIBUTION.md) — none of those belong in an update.
function updatePlan(host = DEFAULT_HOST) {
  const h = HOSTS[host];
  return [
    { type: 'dir', from: 'src/agents', to: h.agentsDir, emit: h.emitAgent },
    { type: 'dir', from: 'src/skills', to: h.skillsDir },
    // Derived from the agents and skills above — an agent added, renamed,
    // or redescribed upstream has to be reflected in the index that
    // points at it, so it is regenerated alongside them.
    ...(h.extraEntries ?? []).filter((e) => e.type === 'generated'),
  ];
}

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
    let out = await readFile(join(PKG_ROOT, f.merge.shell), 'utf8');
    // A deferred install has no core yet, so {{CORE_SECTION}} stays put
    // for whichever bootstrap-core skill runs first to fill in. The host
    // is always known at install time, so {{HOST_DISPATCH}} never is.
    if (f.merge.include) {
      const section = await readFile(join(PKG_ROOT, f.merge.include), 'utf8');
      out = out.replaceAll('{{CORE_SECTION}}', section.trimEnd());
    }
    const dispatch = await readFile(join(PKG_ROOT, f.merge.dispatch), 'utf8');
    await writeFile(f.dest, out.replaceAll('{{HOST_DISPATCH}}', dispatch.trimEnd()));
    return;
  }
  // Rendered from the payload rather than copied from it — the routing
  // doc's tables are built from the agents' and skills' own frontmatter.
  if (f.generate) {
    await writeFile(f.dest, await f.generate({ pkgRoot: PKG_ROOT, projectRoot: DEST_ROOT }));
    return;
  }
  // A host whose format differs from the canonical one rewrites the file
  // on the way in. Hosts that read the canonical format have no emitter,
  // so their payload is copied verbatim.
  if (f.emit) {
    await writeFile(f.dest, f.emit(await readFile(f.src, 'utf8'), { src: f.src }));
    return;
  }
  await cp(f.src, f.dest);
}

// Every destination file this plan would write, resolved absolute.
async function plannedFiles(entry) {
  if (entry.type === 'merge') {
    return [{ dest: join(DEST_ROOT, entry.to), merge: entry }];
  }
  if (entry.type === 'generated') {
    return [{ dest: join(DEST_ROOT, entry.to), generate: entry.generate }];
  }
  const src = join(PKG_ROOT, entry.from);
  if (entry.type === 'file') {
    return [{ src, dest: join(DEST_ROOT, entry.to), emit: entry.emit }];
  }
  const out = [];
  async function walk(rel) {
    const abs = join(src, rel);
    const st = await stat(abs);
    if (st.isDirectory()) {
      for (const name of await readdir(abs)) await walk(join(rel, name));
    } else {
      const renamed = DOTFILE_RENAMES[rel] ?? rel;
      out.push({ src: abs, dest: join(DEST_ROOT, entry.to, renamed), emit: entry.emit });
    }
  }
  await walk('.');
  return out;
}

async function help() {
  const cores = await availableCores();
  console.log(`
${bold('Hedgehog installer')}

Copies the Hedgehog agents and skills into your coding agent's own
directory, drops that agent's instructions file, an AGENTS.md index, and an
empty build graph (${bold('.hedgehog/hedgehog.db')}) into the repo root, so
the discipline is committed alongside your code.

${bold('Usage')}
  npx @skyf0xx/hedgehog init                      install; planner picks the core at intake
  npx @skyf0xx/hedgehog init --ts-full-stack-app  scaffold the full-stack-app core now
  npx @skyf0xx/hedgehog init --landing-page       scaffold the landing-page core now
  npx @skyf0xx/hedgehog init --cursor             install for Cursor (default: Claude Code)
  npx @skyf0xx/hedgehog init --host=claude,gemini install for several coding agents at once
  npx @skyf0xx/hedgehog init --all-hosts          install for every supported coding agent
  npx @skyf0xx/hedgehog init --force              overwrite existing files
  npx @skyf0xx/hedgehog update                    refresh the installed agents + skills
  npx @skyf0xx/hedgehog db init                   create .hedgehog/hedgehog.db if absent
  npx @skyf0xx/hedgehog plan                      compile pending intents into tasks + dependencies,
                                                   then open the build graph if anything compiled
  npx @skyf0xx/hedgehog intent add [flags]        add an intent (rules/requirements/dependencies)
  npx @skyf0xx/hedgehog intent add --file <path>  add an intent from a JSON file
  npx @skyf0xx/hedgehog next                      print the task packet for one ready task
  npx @skyf0xx/hedgehog verify <task-id>          run scope + verify checks, commit on pass
  npx @skyf0xx/hedgehog status                    graph overview: counts by status, ready list
  npx @skyf0xx/hedgehog graph                     start (or reuse) the live graph server and open it
  npx @skyf0xx/hedgehog graph --no-open           start (or reuse) the server; print the URL instead
  npx @skyf0xx/hedgehog why <path>                provenance chain for a file
  npx @skyf0xx/hedgehog friction add "<note>"     log a friction note [--task <task-id>]
  npx @skyf0xx/hedgehog friction list             list logged friction, oldest first
  npx @skyf0xx/hedgehog --help

Available cores: ${cores.join(', ')}
Available hosts: ${availableHosts().join(', ')} (default: ${DEFAULT_HOST})

After it runs, commit the payload, open your coding agent, and describe
what you want to build — the planner agent runs planning intake, then
hands off to bootstrap.

Building something else (a CLI, library, browser extension, data
pipeline, desktop app, etc.)? Run plain 'init' with no core flag rather
than picking --ts-full-stack-app or --landing-page by elimination — it
installs the agents, skills, and build graph, the payload every core
shares. The planner agent designs a core at planning intake
(hedgehog-core-design) and bootstrap generates that workspace once it's
confirmed. Describe the actual project and let Phase 0 route it.

${bold('update')} re-copies the agents and skills (and the AGENTS.md index
derived from them) from the installed Hedgehog version, so an
already-bootstrapped project can pick up changes from a newer release. It
refreshes every host the project was installed for, always overwriting
those directories. The instructions file, the build graph, the core
workspace, and vendor-skills/BMAD and vendor-skills/GSAP stay as they
are — those are project-specific or updated deliberately, not by this
command.
`);
}

async function init({ force, core, explicitCore, host = DEFAULT_HOST, hostOnly = false }) {
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
  // against `null` — the shared agents/skills/build-graph payload only.
  const groups = [];
  for (const entry of plan(explicitCore ? core : null, host, { hostOnly })) {
    const files = await plannedFiles(entry);
    groups.push({ entry, files });
  }

  // A generated file is derived from the payload rather than authored in
  // the project, so rewriting it loses nothing and never counts as a
  // conflict — that's what lets a second host be added to a project the
  // first one already set up.
  const conflicts = [];
  for (const { entry, files } of groups) {
    if (entry.type === 'generated') continue;
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

  // Recorded before anything is written: the routing doc is generated
  // from this list, so it has to already name the host being installed.
  await recordHosts(DEST_ROOT, [host]);

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
    console.log(`  3. Open ${HOSTS[host].label} and describe what you want to build.`);
  } else {
    console.log(`  1. ${bold('git add -A && git commit -m "chore: install Hedgehog"')}`);
    console.log(`  2. Open ${HOSTS[host].label} and describe what you want to build.`);
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
        'Core: not chosen yet — this installed the agents, skills, and\n' +
          'build graph every core shares. planner decides which core applies\n' +
          'at planning intake, then bootstrap generates that core\'s workspace.',
      ),
    );
  }
}

async function update({ hosts }) {
  const targets = hosts?.length ? hosts : await installedHosts(DEST_ROOT);

  let written = 0;
  for (const host of targets) {
    const entries = updatePlan(host);

    // Full replace, not a merge: clear each payload directory first so a
    // rename or removal upstream (e.g. an agent renamed between releases)
    // doesn't leave a stale file sitting alongside the new one. Generated
    // files are single files rewritten in place, so they're left alone.
    for (const entry of entries) {
      if (entry.type === 'dir') {
        await rm(join(DEST_ROOT, entry.to), { recursive: true, force: true });
      }
    }

    for (const entry of entries) {
      for (const f of await plannedFiles(entry)) {
        await writePlannedFile(f);
        written++;
        console.log(`  ${green('update')}  ${relative(DEST_ROOT, f.dest)}`);
      }
    }
  }

  const label = targets.map((h) => HOSTS[h].label).join(', ');
  console.log(
    `\n${green(bold('Hedgehog agents/skills updated.'))} ${dim(
      `${written} files written for ${label}`,
    )}\n`,
  );
  console.log('Next steps:');
  const reviewDirs = [
    ...new Set(
      targets.map((h) => {
        const d = dirname(HOSTS[h].agentsDir);
        return d === '.' ? HOSTS[h].agentsDir : `${d}/`;
      }),
    ),
  ];
  console.log(`  1. ${bold(`git diff ${reviewDirs.join(' ')}`)} to review what changed`);
  console.log(`  2. ${bold('git add -A && git commit -m "chore: update hedgehog"')}\n`);
  const bootstraps = [...new Set(targets.map((h) => HOSTS[h].bootstrapFile))].join(', ');
  console.log(
    dim(
      `${bootstraps}, the build graph, the core workspace, and\n` +
        'vendor-skills/BMAD and vendor-skills/GSAP are untouched — those carry\n' +
        'project-specific or write-once content.',
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

  // Only worth opening when this run actually changed the graph's shape
  // — a plan run that compiled nothing (every intent already had tasks)
  // would just re-open what's already open. planTasks's own db handle is
  // closed by this point: the graph server opens its own connection in a
  // separate process, and holding two write-capable handles on the same
  // sqlite file across that handoff invites lock contention for no
  // benefit.
  if (result.compiled.length > 0) {
    const { port } = await startOrReuseGraphServer();
    openInBrowser(`http://localhost:${port}`);
  }
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

const GRAPH_PIDFILE_PATH = '.hedgehog/graph-server.json';
const GRAPH_SERVER_MODULE = join(PKG_ROOT, 'src/db/graph-server.mjs');
const GRAPH_TEMPLATE_PATH = join(PKG_ROOT, 'src/templates/graph.html');

// Opens a URL/file with the OS default handler — the same mechanism
// `open` (macOS), `xdg-open` (Linux), and `start` (Windows) provide,
// chosen per-platform so this stays a zero-dependency CLI rather than
// reaching for an npm package to do what the OS already does.
function openInBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  const args = platform === 'win32' ? ['', url] : [url];
  spawn(cmd, args, { detached: true, stdio: 'ignore', shell: platform === 'win32' }).unref();
}

// True if `pid` names a live process. Sending signal 0 performs the
// existence/permission check without actually signalling anything — the
// standard POSIX idiom `kill -0` follows, and Node exposes it the same
// way via process.kill.
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Returns the port of a running graph server for this project, starting
// one if none is live. Both `plan` (auto-open after scoping) and `graph`
// (explicit request) call this rather than each managing their own
// server, so a project only ever has one live server no matter which
// command a person or agent happens to run — re-running `plan` after
// `graph` is already open reuses the same tab's server instead of
// spawning a second one bound to a different port.
async function startOrReuseGraphServer() {
  const pidfilePath = join(DEST_ROOT, GRAPH_PIDFILE_PATH);

  if (await exists(pidfilePath)) {
    try {
      const { pid, port } = JSON.parse(await readFile(pidfilePath, 'utf8'));
      if (isProcessAlive(pid)) return { port, reused: true };
    } catch {
      // Corrupt or half-written pidfile from a killed server — fall
      // through and start a fresh one rather than failing the command.
    }
    await rm(pidfilePath, { force: true });
  }

  const child = spawn(
    process.execPath,
    [GRAPH_SERVER_MODULE, join(DEST_ROOT, DB_PATH), GRAPH_TEMPLATE_PATH, pidfilePath],
    { detached: true, stdio: ['ignore', 'pipe', 'ignore'] },
  );
  child.unref();

  // Waits for graph-server.mjs's own "LISTENING <port>" line rather than
  // polling the pidfile, so the caller can't race a pidfile that exists
  // but was written a moment before the port was actually bound.
  //
  // child.unref() alone only unrefs the child process handle — the
  // stdout pipe is a separate stream the parent still holds open, and
  // leaving a 'data' listener on it keeps the event loop alive even
  // after this promise resolves (the earlier version of this function
  // hung the parent CLI process for exactly that reason). Explicitly
  // removing every listener and unref()-ing the stream once the port is
  // known lets the parent exit as soon as its own work is done, leaving
  // the detached child running independently.
  const port = await new Promise((resolvePort, rejectPort) => {
    let buf = '';
    function cleanup() {
      child.stdout.off('data', onData);
      child.off('error', onError);
      child.off('exit', onExit);
      child.stdout.unref();
    }
    function onData(chunk) {
      buf += chunk;
      const match = buf.match(/LISTENING (\d+)/);
      if (match) {
        cleanup();
        resolvePort(Number(match[1]));
      }
    }
    function onError(err) {
      cleanup();
      rejectPort(err);
    }
    function onExit(code) {
      if (code !== 0) {
        cleanup();
        rejectPort(new Error(`graph server exited early (code ${code})`));
      }
    }
    child.stdout.on('data', onData);
    child.once('error', onError);
    child.once('exit', onExit);
  });

  return { port, reused: false };
}

async function graphCommand(args) {
  if (!(await exists(DB_PATH))) {
    console.error(`${red('No build graph found.')} Run ${bold('hedgehog db init')} first.\n`);
    process.exitCode = 1;
    return;
  }

  const { port, reused } = await startOrReuseGraphServer();
  const url = `http://localhost:${port}`;
  console.log(
    `  ${reused ? dim('reusing') : green('started')}  graph server ${dim(`(${url})`)}`,
  );

  // --no-open covers headless/SSH sessions where there's no local
  // browser to hand a URL to — the server itself is still started (or
  // reused) either way, since a remote person may open the URL manually
  // via port-forwarding.
  if (args.includes('--no-open')) {
    console.log(`\nOpen ${bold(url)} in a browser to view it.`);
  } else {
    openInBrowser(url);
  }
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

  // Which coding agent this repo is being set up for. `--host=<name>` and
  // the per-host shorthand flags are equivalent; absent either, the
  // default host applies.
  const allHosts = args.includes('--all-hosts');
  const hostFlags = args.filter((a) => a in HOST_FLAGS).map((a) => HOST_FLAGS[a]);
  const hostEq = args
    .filter((a) => a.startsWith('--host='))
    .flatMap((a) => a.slice('--host='.length).split(','))
    .map((h) => h.trim())
    .filter(Boolean);
  const named = [...new Set([...hostFlags, ...hostEq])];
  const unknown = named.filter((h) => !(h in HOSTS));
  if (unknown.length) {
    console.error(
      `${red('Unknown host:')} ${unknown.join(', ')}\n\n` +
        `Available hosts: ${availableHosts().join(', ')}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const hosts = allHosts ? availableHosts() : named;

  if (cmd === 'init') {
    // The shared payload — vendored shelves, core workspace — lands with
    // the first host; the rest add only what differs per host.
    const targets = hosts.length ? hosts : [DEFAULT_HOST];
    for (const [i, host] of targets.entries()) {
      await init({
        force,
        core,
        explicitCore: Boolean(coreFlag),
        host,
        hostOnly: i > 0,
      });
    }
    return;
  }

  if (cmd === 'update') {
    await update({ hosts });
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

  if (cmd === 'graph') {
    await graphCommand(args.slice(1));
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
