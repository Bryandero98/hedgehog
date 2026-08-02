#!/usr/bin/env node
// Hedgehog installer. Copies the agents/skills payload and root templates
// into the current repo, so the discipline travels with the project.
//
// Usage:
//   npx @skyf0xx/hedgehog init                        scaffold, ts-full-stack-app core (default)
//   npx @skyf0xx/hedgehog init --landing-page          scaffold the landing-page core instead
//   npx @skyf0xx/hedgehog init --force                 overwrite files that already exist
//   npx @skyf0xx/hedgehog update                       refresh .claude/agents + .claude/skills
//   npx @skyf0xx/hedgehog --help

import { cp, mkdir, access, readdir, stat, rm, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { dbInit, DB_PATH } from '../src/db/init.mjs';

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
function plan(core) {
  return [
    { type: 'dir', from: 'src/agents', to: '.claude/agents' },
    { type: 'dir', from: 'src/skills', to: '.claude/skills' },
    // The vendored BMAD-METHOD planning shelf that hedgehog-planning-intake
    // runs — referenced by repo-root-relative path (skills/BMAD/...), so it
    // lands there rather than under .claude/.
    { type: 'dir', from: 'skills/BMAD', to: 'skills/BMAD' },
    // The vendored GSAP animation skill shelf that front-end-eng loads for
    // motion work — same repo-root-relative referencing as skills/BMAD.
    { type: 'dir', from: 'skills/GSAP', to: 'skills/GSAP' },
    {
      type: 'merge',
      shell: 'src/templates/CLAUDE.md',
      include: `src/templates/CLAUDE.core.${core}.md`,
      to: 'CLAUDE.md',
    },
    {
      type: 'merge',
      shell: 'src/templates/TODO.md',
      include: `src/templates/TODO.core.${core}.md`,
      to: 'TODO.md',
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
// verbatim. CLAUDE.md/TODO.md carry project-filled content, the core
// workspace is verified once by its bootstrap-core skill, and
// skills/BMAD and skills/GSAP are re-vendored only deliberately (a
// manual re-vendor, per each shelf's ATTRIBUTION.md) — none of those
// belong in an update.
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

Copies the Hedgehog agents and skills into ${bold('.claude/')} and drops the
CLAUDE.md / TODO.md templates into the repo root, so the discipline is
committed alongside your code.

${bold('Usage')}
  npx @skyf0xx/hedgehog init                      scaffold, ${DEFAULT_CORE} core (default)
  npx @skyf0xx/hedgehog init --ts-full-stack-app  scaffold the full-stack-app core explicitly
  npx @skyf0xx/hedgehog init --landing-page       scaffold the landing-page core instead
  npx @skyf0xx/hedgehog init --force              overwrite existing files
  npx @skyf0xx/hedgehog update                    refresh .claude/agents + .claude/skills
  npx @skyf0xx/hedgehog db init                   create .hedgehog/hedgehog.db if absent
  npx @skyf0xx/hedgehog --help

Available cores: ${cores.join(', ')}

After it runs, commit the payload, open Claude Code, and describe what
you want to build — the planner agent runs planning intake, then hands
off to bootstrap.

${bold('update')} re-copies only .claude/agents and .claude/skills from the
installed Hedgehog version, so an already-bootstrapped project can pick up
agent/skill changes from a newer release. It always overwrites those two
directories and never touches CLAUDE.md, TODO.md, the core workspace, or
skills/BMAD and skills/GSAP — those are project-specific or updated
deliberately, not by this command.
`);
}

async function init({ force, core }) {
  const cores = await availableCores();
  if (!cores.includes(core)) {
    console.error(
      `${red('Unknown core:')} ${core}\n\nAvailable cores: ${cores.join(', ')}\n`,
    );
    process.exitCode = 1;
    return;
  }

  // Resolve the full list of writes up front so we can detect conflicts
  // before touching anything.
  const groups = [];
  for (const entry of plan(core)) {
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

  console.log(
    `\n${green(bold('Hedgehog installed.'))} ${dim(
      `${written} created${overwritten ? `, ${overwritten} overwritten` : ''}`,
    )}\n`,
  );
  console.log('Next steps:');
  console.log(`  1. ${bold('git add -A && git commit -m "chore: install Hedgehog"')}`);
  console.log(`  2. ${bold('pnpm install')}`);
  console.log(`  3. Open Claude Code and describe what you want to build.`);
  console.log(
    dim(
      `     The ${bold('planner')} agent runs planning intake, then hands off to bootstrap.`,
    ),
  );
  console.log();
  console.log(dim(`Core: ${bold(core)} (installer default — planner may override it).`));
  console.log(
    dim(
      core === DEFAULT_CORE
        ? '(Nx, packages/config, packages/db, apps/api, apps/web) — bootstrap\n' +
            'runs whichever add-ons (Auth, Queue, Mobile) intake calls for.'
        : 'bootstrap runs whichever add-on steps this core defines, if any.',
    ),
  );
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
      'CLAUDE.md, TODO.md, the core workspace, and skills/BMAD and\n' +
        'skills/GSAP are untouched — those carry project-specific or\n' +
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
    await init({ force, core });
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

  console.error(`${red('Unknown command:')} ${cmd}\n`);
  await help();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\n${red(bold('Install failed:'))} ${err.message}\n`);
  process.exitCode = 1;
});
