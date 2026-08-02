---
name: hedgehog-bootstrap-authored-core
description: Use once, at the start of a new Hedgehog project on an authored core (`hedgehog-core-design` wrote `.hedgehog/core.yaml`), to clear the default scaffold `init` landed and generate a verified workspace for the stack `hedgehog-core-design` chose. Runs as the `bootstrap` agent's only move on this core, and closes Bootstrap.
---

# Hedgehog Bootstrap — authored core

Lands the workspace for a project whose core `hedgehog-core-design`
designed. The stack varies per project (that skill's Step 2 stack
table), so this workspace is generated live from the ecosystem's own
tooling and verified before it's committed.

## Why this exists

`hedgehog init` scaffolds a default golden-core payload before `planner`
runs Phase 0 — a CLI has to pick something to copy, and `full-stack-app`
is that default (`bin/cli.mjs`'s `DEFAULT_CORE`). When Phase 0 designs a
core instead, that scaffold (`nx.json`, `packages/`, `apps/api`,
`apps/web`, the root `package.json`, full-stack-app's section of root
`CLAUDE.md`) is speculative output this project never confirmed. Clearing
it is this skill's first job: left in place, it collides with the
generated workspace on `package.json`, lockfiles, and root config.

## Steps

### 1. Confirm this hasn't already run

Check for a `feat(<project>): workspace` commit matching
`.hedgehog/core.yaml`'s `id` (`git log --oneline --grep="^feat("`), or
the presence of a root config file the stack in `core-design.md` would
produce (e.g. `wxt.config.ts` for a WXT browser extension,
`pyproject.toml` for a Python CLI). Either means this already ran — stop
there. A workspace that looks wrong is a Correction Protocol case against
the specific file.

### 2. Remove the speculative default scaffold

`init` lands `full-stack-app`'s golden-core payload by default, so
`nx.json` at the repo root is the tell. Its presence means the scaffold
is still in place; clear it before generating the real workspace:

- Delete these root files: `nx.json`, `package.json`,
  `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `docker-compose.yml`,
  `core.yaml` (full-stack-app's own core definition — the authored one
  lives at `.hedgehog/core.yaml`), `tsconfig.json`, `tsconfig.base.json`,
  `vitest.workspace.ts`, `eslint.config.mjs`, `commitlint.config.cjs`,
  `lefthook.yml`, `.env.example`, `.prettierrc`, `.prettierignore`,
  `.gitignore`.
- Delete these root directories in full: `packages/` (`config`, `db`),
  `apps/` (`api`, `api-e2e`, `web`, `web-e2e`), `tools/`
  (`phase-gate.cjs`), `.github/` (`workflows/phase-gate.yml`),
  `.vscode/`. None of it was ever installed — `pnpm install` hasn't run
  on a fresh `init` — so this removes scaffolded source files, with no
  running infra and no data involved.
- The generator in step 4 lands its own `.gitignore`; if it doesn't,
  write one for the chosen stack before committing.
- Rebuild root `CLAUDE.md` from the templates `init` landed in
  `.hedgehog/templates/`: take `CLAUDE.md` (the shell) and replace its
  `{{CORE_SECTION}}` placeholder with the full contents of
  `CLAUDE.core.authored.md`. Carry over the `{{PROJECT_NAME}}` and
  `{{PROJECT_SUMMARY}}` values `planner` already filled into the current
  root `CLAUDE.md` — those are project content, written at planning
  intake, and the rebuild must not blank them. Delete
  `.hedgehog/templates/` once the rebuild lands; it exists for this one
  step.
- Leave `.claude/agents/`, `.claude/skills/`, `skills/BMAD/`,
  `skills/GSAP/`, and the rest of `.hedgehog/` in place — the build
  graph, the planning archive, and the design files this step reads from
  install the same regardless of which core Phase 0 picks.

`nx.json` absent means the scaffold was already cleared — skip straight
to the `CLAUDE.md` rebuild, which still applies.

### 3. Read the stack choice

Read `.hedgehog/core-design.md`'s Step 2 record (language, package
manager, named framework(s), test runner) and `.hedgehog/core.yaml`'s
`id` and `layers`. These two files are the only inputs — don't re-derive
the stack from the project description; that decision was already made
and locked at `hedgehog-core-design`'s Confirm & Lock.

### 4. Generate the workspace

Scaffold the stack named in `core-design.md` at the repo root using that
ecosystem's own official generator — the one its documentation puts on
the getting-started page. A generator already encodes the conventions,
lockfile, and config layout that ecosystem expects, which is why this
step runs one rather than hand-writing a skeleton.

Generator CLIs, their flags, and their names change between releases, so
confirm the current invocation from the tool's own documentation before
running it. Working from memory here is how a bootstrap fails on a
renamed flag. Where a framework ships a generator (WXT, Electron, a web
framework), that generator is the entry point; where the language's
toolchain is the generator (`cargo`, `go mod`, `uv`, `pnpm`), that is.

By the end of this step the workspace has, whatever the stack:

- A dependency manifest and lockfile, with the framework(s) and test
  runner from `core-design.md` installed.
- A test runner wired to a command, so a layer's `verify` can call it.
- A build or typecheck command, where the language has one.
- Source directories that the layer `scope` globs in `.hedgehog/core.yaml`
  actually match.

Strip anything the generator scaffolds that collides with Hedgehog's own
root conventions — its own `AGENTS.md`, `CLAUDE.md`, `README.md`, or
workspace manifest. A generator written for standalone repos doesn't know
it's landing inside a Hedgehog project's root, and those files shadow the
real ones.

A gap between the generated workspace and `.hedgehog/core.yaml` — a
`verify` command naming a test runner the generator didn't wire, a
`scope` glob pointing at a directory the stack doesn't produce — is a
mismatch between the design and this step. `core.yaml` is locked and this
step conforms to it: close the gap by wiring what the design expects.
Where the design asks for something the stack genuinely can't provide,
stop and report it.

### 5. Install and verify

Install dependencies via the ecosystem's package manager, then run every
layer's `verify` command from `.hedgehog/core.yaml` once, in order,
against the freshly generated workspace. Each should pass clean: with no
domain content yet, this checks that the toolchain wiring those commands
depend on actually works.

A `verify` command that fails here fails for a reason worth naming
before any layer is built on top of it — a missing test runner, a script
the generator didn't add, a path that doesn't exist. Fix the generation
(step 4), then re-run this step.

### 6. Commit

```
feat(<id>): workspace
```

using `.hedgehog/core.yaml`'s `id`. One commit for the whole of this
core's bootstrap, which closes Bootstrap. State plainly that
`hedgehog-authored-loop` owns everything from here, one layer at a time.

## Constraints

- Run once per project, as the `bootstrap` agent's only move on an
  authored core — never invoked standalone.
- The stack choice, layer sequence, and every `core.yaml` field are
  locked at `hedgehog-core-design`'s Confirm & Lock. This skill executes
  that design. A stack or layer that turns out wrong once generation is
  underway is a Correction Protocol case through `planner`.
- Write no domain content in the generated workspace — no business
  logic, no first layer's files. That's the first build task, started
  once this Bootstrap commit lands.
- Step 2's deletions are safe by construction: `init`'s default scaffold
  has never been installed or run on a project that reaches this skill,
  since Phase 0 completes before any `pnpm install`. It's unused
  template output.
- A repo with no default scaffold at all makes step 2 a no-op on the
  workspace files; the `CLAUDE.md` rebuild still runs.
