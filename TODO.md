# TODO — Persistent Build Graph

Implements [hedgehog-persistent-build-graph.md](hedgehog-persistent-build-graph.md),
the source-of-truth spec. Read that file for the *why* and the exact
shapes (schema, CLI output, packet format) — this file is only the
ordered checklist. Each step gates the next; don't start a step until
the one before it is checked and working.

Delegate each step to a fresh-context agent with: the step's own
description below, plus a pointer to the relevant spec section. Don't
paste the whole spec into every step's context.

Once a step's own boxes (including its Verify line) are checked, before
starting the next step: commit the step's changes (one commit, files
scoped to that step only — don't sweep in unrelated untracked files),
then write a fresh-context prompt for the next step and hand it back.
The prompt should point at this file and the relevant spec section(s),
not restate their content.

## 1 — Schema + DB bootstrap

- [x] Write `.hedgehog/hedgehog.db` schema as a migration/init script
      (spec: "SQLite as build state" → Schema). All nine tables:
      `intents`, `requirements`, `intent_dependencies`, `tasks`,
      `task_requirements`, `dependencies`, `artifacts`, `verifications`,
      `friction`. Use `node:sqlite`, no dependency.
- [x] `hedgehog db init` — creates `.hedgehog/hedgehog.db` if absent,
      no-ops if present.
- [x] Verify: fresh init produces a file passing `PRAGMA foreign_keys`
      and every `CHECK` constraint from the spec (insert a row that
      violates each constraint, confirm rejection).

## 2 — Core definition format

- [x] Define the core-definition YAML shape (spec: "Core definitions").
      One loader, used identically for shipped and authored cores.
- [x] Write `src/golden-cores/full-stack-app/core.yaml` — schema →
      contract → repository → service → controller → hook → screen,
      each with `scope`, `verify`, `commit` (derive from
      `src/skills/hedgehog-loop`'s existing step tables).
- [x] Write `src/golden-cores/landing-page/core.yaml` — brief → feeling →
      tokens → sequence → artifact, linear chain, no module axis (spec:
      MVP scope item 5 — degenerate case of the layer graph).
- [x] Verify: loader parses both files, rejects a layer missing `scope`
      or `verify`.

## 3 — Compiler

- [x] `hedgehog plan` — reads pending intents + `intent_dependencies` +
      the project's core definition, emits `tasks` + `dependencies` rows.
      Full-stack-app: layer × module. Landing-page: one task per phase.
- [x] Verify: one intent with no dependencies compiles to the full layer
      chain for its module, each task's `depends_on` matching the core
      definition's order; a second intent depending on the first
      produces a task graph where its first task can't be `ready` until
      the first intent's last task is `complete`.

## 4 — `hedgehog intent add`

- [x] CLI command writing an `intents` row (+ `requirements`,
      `intent_dependencies`) from flags or a JSON file (spec: "Intent
      records").
- [x] Verify: round-trip — add an intent, query it back via `sqlite3`.

## 5 — `hedgehog next`

- [x] Readiness query (spec: the `SELECT` under "Schema") + task-packet
      assembly (spec: "The task packet").
- [x] Output format matches spec's `hedgehog next` example exactly
      (STATUS / WHY NOW / BLOCKED DOWNSTREAM / ALLOWED SCOPE /
      VERIFICATION).
- [x] Verify: on the graph from step 3, `hedgehog next` returns the
      first schema task and nothing else; after manually marking it
      `complete`, returns the contract task.

## 6 — `hedgehog verify`

- [x] Scope pre-check: `git diff --name-only` against `scope_globs`;
      violation refuses to run verification, task stays `implemented`
      (spec: "Scope enforcement is a hard pre-verification check").
- [x] On scope pass: run `verify_command`, write a `verifications` row,
      on exit 0 → `verified` → record `artifacts` → commit with
      `commit_message` → `complete` → re-evaluate dependents to `ready`.
      On nonzero exit → `failed`, output retained, dependents stay
      blocked.
- [x] Verify: a task edited outside its scope is refused pre-verify; a
      task edited in-scope with a failing test lands as `failed` with
      output queryable; a passing task unlocks exactly its direct
      dependents.

## 7 — `hedgehog status` / `hedgehog why`

- [ ] `status` — graph overview (counts by status, ready list).
- [ ] `why <path>` — walks `artifacts` → `tasks` → `task_requirements` →
      `requirements` → `intents` (spec: "Traceability").
- [ ] Verify: `why` on a file from step 6 prints the full chain back to
      the originating intent.

## 8 — `planner` / `hedgehog-planning-intake` rewrite

- [ ] Phase 1 mining reads `04-prd.md` only, per the PRD→graph-row table
      (spec: "Mapping BMAD output to intents"). Brainstorming/brief/
      PR-FAQ/deep-recon stay archived, unread by mining.
- [ ] Mining writes intents via `hedgehog intent add`, not `TODO.md`.
- [ ] Phase 0 core selection gains the third outcome: no shipped core
      fits → interview → write `.hedgehog/core.yaml` (spec: "Authored
      cores").
- [ ] Confirm & Lock stage shows the compiled graph (via `hedgehog
      status` or equivalent), not a `TODO.md` preview.

## 9 — `hedgehog-loop` / `hedgehog-landing-loop` rewrite

- [ ] Step tables become read-only reference to
      `src/golden-cores/*/core.yaml` (already the source of truth as of
      step 2) — skill file keeps phase rules, intra-step conventions,
      Correction Protocol, friction log.
- [ ] Loop procedure changes from "read TODO.md, pick next unchecked" to
      "`hedgehog next`, delegate the packet, `hedgehog verify`."
- [ ] Friction log: append to the `friction` table (via CLI) instead of
      `.hedgehog/friction.md`.
- [ ] `landing-page/core.yaml`'s `feeling`/`tokens`/`sequence` layers ship
      with a placeholder `verify: "true"` (step 2) — `hedgehog-landing-loop`
      only documents these gates as agent self-test + user lock, no file
      path or shell command. Decide and wire a real verify (e.g. self-test
      result written to a file `verify` can check, or another mechanism)
      before this core's `hedgehog verify` is anything but a no-op for
      those three phases.

## 10 — Agent updates

- [ ] `backend-eng.md`, `front-end-eng.md` — receive a task packet, not
      a step name; scope is enforced by `hedgehog verify`, not
      self-discipline; report evidence, never self-certify status.
- [ ] `tweaker.md` — friction review reads the `friction` table.
- [ ] `reviewer.md` — no change in purpose; confirm nothing references
      `TODO.md`.

## 11 — Template + installer cleanup

- [ ] Delete `src/templates/TODO.md`, `TODO.core.full-stack-app.md`,
      `TODO.core.landing-page.md`.
- [ ] `src/templates/CLAUDE.md` — replace "Consuming TODO.md" section
      with "Consuming the graph": `hedgehog next`, never re-derive state
      from prose. Keep the context-management guidance.
- [ ] `bin/cli.mjs` — wire the new subcommands (`intent`, `plan`, `next`,
      `verify`, `status`, `why`, `db init`) alongside the existing
      installer commands.
- [ ] `package.json` `files` — confirm `src/golden-cores` is included
      (already listed; verify the new `core.yaml` files land in the
      published package).

## 12 — End-to-end proof

- [ ] Fresh install (`npx @skyf0xx/hedgehog init --ts-full-stack-app`)
      into a scratch repo → one intent through planning intake → full
      Phase A for one module via `hedgehog next`/`verify` loop → `why`
      traces a generated file back to the intent. This is the MVP's
      stated proof (spec: "MVP") — the acceptance test for this whole
      TODO.
- [ ] Same proof on `--landing-page`: one intent → five-phase chain via
      `next`/`verify` → artifact produced.

## Explicitly not in this pass

Per spec "MVP": no project-management UI, no multi-agent orchestration,
no autonomous repo-wide planning, no indexing of existing/non-Hedgehog
code into the graph. Per spec "Open questions": amending an already-
`complete` intent is unresolved — don't build amendment handling now,
flag it if it comes up.
