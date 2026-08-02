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

- [x] `.hedgehog/hedgehog.db` schema as a migration/init script (spec:
      "SQLite as build state" → Schema). All nine tables: `intents`,
      `requirements`, `intent_dependencies`, `tasks`, `task_requirements`,
      `dependencies`, `artifacts`, `verifications`, `friction`. Uses
      `node:sqlite`, no dependency.
- [x] `hedgehog db init` — creates `.hedgehog/hedgehog.db` if absent,
      no-ops if present.
- [x] Verify: fresh init produces a file passing `PRAGMA foreign_keys`
      and every `CHECK` constraint from the spec (insert a row that
      violates each constraint, confirm rejection).

## 2 — Core definition format

- [x] Core-definition YAML shape (spec: "Core definitions"). One loader,
      used identically for shipped and authored cores.
- [x] `src/golden-cores/full-stack-app/core.yaml` — schema → contract →
      repository → service → controller → hook → screen, each with
      `scope`, `verify`, `commit`.
- [x] `src/golden-cores/landing-page/core.yaml` — brief → feeling →
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

- [x] `status` — graph overview (counts by status, ready list).
- [x] `why <path>` — walks `artifacts` → `tasks` → `task_requirements` →
      `requirements` → `intents` (spec: "Traceability").
- [x] Verify: `why` on a file from step 6 prints the full chain back to
      the originating intent.

## 8 — `planner` / `hedgehog-planning-intake` rewrite

- [x] Phase 1 mining reads `04-prd.md` only, per the PRD→graph-row table
      (spec: "Mapping BMAD output to intents"). Brainstorming/brief/
      PR-FAQ/deep-recon stay archived, unread by mining.
- [x] Mining writes intents via `hedgehog intent add`.
- [x] Phase 0 core selection has three outcomes; the third — no shipped
      core fits — runs BMAD Phase 0 then `hedgehog-core-design`, which
      writes `.hedgehog/core.yaml` (spec: "Authored cores").
- [x] Confirm & Lock stage shows the compiled graph (via `hedgehog
      status` or equivalent).
- [x] Verify: hand-traced a sample `04-prd.md` (one Feature/FR/Glossary
      relationship) against the mining procedure, then executed the
      resulting `hedgehog intent add` invocations for real — 2 `intents`
      rows, 5 `requirements` rows (`acceptance`/`rule` kinds matching the
      table), 1 `intent_dependencies` row, matching the PRD→graph-row
      table exactly; `hedgehog plan`/`status`/`next` correctly compiled
      and sequenced the result.

## 9 — `hedgehog-loop` / `hedgehog-landing-loop` rewrite

- [x] Step tables are a read-only reference to `src/golden-cores/*/core.yaml`
      — skill file keeps phase rules, intra-step conventions, Correction
      Protocol, friction log.
- [x] Loop procedure: `hedgehog next`, delegate the packet, `hedgehog
      verify`.
- [x] Friction log appends to the `friction` table via `src/db/friction.mjs`
      and `hedgehog friction add`/`hedgehog friction list`.
- [x] `landing-page/core.yaml`'s `feeling`/`tokens`/`sequence` layers
      write and check their own chain-record file (`.hedgehog/chain/01-
      feeling.md`, `02-tokens.md`, `03-sequence.md`), the same pattern
      `brief`'s `test -s` uses.
- [x] `hedgehog-landing-loop`'s planning-intake section writes exactly
      one `landing` intent via `hedgehog intent add` and runs `hedgehog
      plan`, giving `landing-page/core.yaml` an intent to compile
      against.
- [x] The Add-ons decision (Auth/Queue/Mobile — one-time, project-wide
      Bootstrap infra, not a domain module or a compiled layer, so it has
      no home in the `intents`/`tasks` schema) lives in
      `.hedgehog/addons.yaml`, written by `planner` at planning intake.
      `bootstrap.md`, `hedgehog-bootstrap` and its two core-scaffold
      skills, `hedgehog-loop`, `backend-eng.md`, and `reviewer.md` all
      read that file. `bootstrap.md`'s Bootstrap-step selection (which
      core piece or add-on is next) is commit-log-based throughout.
- [x] Verify: `loadCore` parses `landing-page/core.yaml` cleanly — all
      five layers, scope/verify/commit fields intact. `hedgehog friction
      add`/`list` round-tripped in a scratch `.hedgehog/hedgehog.db` and
      via the CLI end to end. No bootstrap-family file references
      `TODO.md`.

## 10 — Agent updates

- [x] `backend-eng.md`, `front-end-eng.md` — receive a task packet, not
      a step name; scope is enforced by `hedgehog verify`, not
      self-discipline; report evidence, never self-certify status.
- [x] `tweaker.md` — friction review reads the `friction` table
      (`hedgehog friction list`); reviewed-marker is a sentinel friction
      row.
- [x] `reviewer.md`'s self-check (Queue add-on check →
      `.hedgehog/addons.yaml`) genuinely holds.
- [x] Verify: no agent file references `TODO.md`.

## 11 — Template + installer cleanup

- [x] `src/templates/TODO.md`, `TODO.core.full-stack-app.md`,
      `TODO.core.landing-page.md` are removed.
- [x] `src/templates/CLAUDE.md`'s "Consuming the graph" section:
      `hedgehog next`, never re-derive state from prose.
- [x] `bin/cli.mjs` — the new subcommands (`intent`, `plan`, `next`,
      `verify`, `status`, `why`, `db init`, `friction`) are wired
      alongside the installer commands. `init()` calls `dbInit` so a
      fresh install creates `.hedgehog/hedgehog.db`.
- [x] `package.json` `files` includes `src/golden-cores` and `src/db`, so
      the `core.yaml`/CLI-backing files land in the published package.
- [x] Verify: fresh `hedgehog init` into a scratch repo produces no
      `TODO.md`, creates `.hedgehog/hedgehog.db`, and no help/log string
      in `bin/cli.mjs` references the old templates.

## 12 — End-to-end proof

- [x] Graph loop proven end to end in a scratch repo against
      `full-stack-app/core.yaml`: two intents (one depending on the
      other) → `plan` → the full seven-layer chain driven through
      `next`/`verify` → each pass unlocking exactly its dependent → the
      cross-intent edge releasing the second intent's chain only after
      the first completed → `why` tracing a generated file back through
      its task and verification to a named requirement and its intent.
      Scope violations were refused pre-verification (task left
      `implemented`, no `verifications` row).
- [x] Same loop proven on `landing-page/core.yaml`: one intent → the
      five-phase linear chain compiled with no module axis → `brief`
      verified and committed via its `test -s` check.
- [ ] Full install-path proof: `npx @skyf0xx/hedgehog init
      --ts-full-stack-app` into a scratch repo, driven through real
      planning intake (BMAD shelf → PRD mining) and a real toolchain
      (`pnpm nx test`) rather than the graph mechanics in isolation. The
      shipped cores' actual `verify` commands are unproven against a
      generated workspace — the proof above substitutes trivially
      passing verify commands to exercise the state machine.

## Explicitly not in this pass

Per spec "MVP": no project-management UI, no multi-agent orchestration,
no autonomous repo-wide planning, no indexing of existing/non-Hedgehog
code into the graph. Amending an already-`complete` intent is
unresolved (spec: "Open questions") — don't build amendment handling
now, flag it if it comes up.
