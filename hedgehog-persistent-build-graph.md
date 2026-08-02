# Hedgehog: Persistent Build Graph

## What Hedgehog is

Hedgehog is an **execution engine for AI-built software**.

A human states an outcome. Hedgehog compiles it into a dependency-aware
build graph, hands an AI agent the minimum context for exactly one node,
verifies the result before accepting it, records the outcome, and unlocks
whatever the node was blocking.

```text
Human intent
     ↓
Hedgehog planner  →  compiles
     ↓
SQLite build graph  →  .hedgehog/hedgehog.db
     ↓
hedgehog next  →  one task packet
     ↓
AI worker  →  code
     ↓
hedgehog verify  →  runs the checks
     ↓
state update  →  unlocks dependents
     ↓
next task
```

The AI is the **executor**. The engine owns decomposition, build order,
dependency tracking, architectural boundaries, task context, progress
state, verification, and provenance.

## The problem this solves

AI-assisted projects degrade as they grow:

- The plan lives in chat history or large Markdown documents.
- Context bloats; agents re-derive project state every session.
- Build order is inferred from prose rather than enforced.
- Different agents make different architectural choices.
- Planning artifacts drift from the code.
- Progress is tracked informally rather than as machine-readable state.

The failure is not code generation. It is that the AI has too many valid
choices and too little persistent, structured knowledge about what
happens next.

Hedgehog's answer: make "what happens next" a query, not an inference.

## Core principles

1. **Intent over ceremony** — capture outcome and constraints; no agile
   paperwork, no long stories.
2. **Execution over documentation** — planning artifacts exist to drive
   verified implementation.
3. **Persistent state over chat memory** — project knowledge lives in a
   queryable runtime.
4. **Small context over giant prompts** — the AI receives one task
   packet, assembled by query, never the whole plan.
5. **Explicit dependencies over inferred order** — build order is graph
   edges, not paragraphs.
6. **Architecture as constraints** — correct structure is enforced, not
   repeatedly explained.
7. **Verification before completion** — an agent cannot mark its own work
   done; the engine runs the checks.
8. **Traceability by default** — code, tasks, requirements, and intent
   stay connected.
9. **AI as executor** — the engine owns long-term coordination.
10. **Code remains the artifact** — SQLite coordinates the build; the
    repository is the software.

## Relationship to BMAD

BMAD turns an idea into planning artifacts: brief, PRD, architecture, UX
spec. Hedgehog starts where that output ends.

```text
BMAD                        Hedgehog
────                        ────────
discovery                   ingest intent + constraints
brief / PRD                 compile the build graph
architecture       ──────▶  execute atomic tasks
UX spec                     enforce architecture
                            verify each layer
```

> BMAD tells the AI what to build. Hedgehog controls how it gets built.

BMAD remains the planning shelf behind `hedgehog-planning-intake`. Its
output is mined into intents and a core definition — not carried forward
as prose the AI must re-read.

## What Hedgehog is not

- an agile project-management tool or Jira replacement
- a PRD generator or story-writing framework
- a library of generic agent prompts
- a system requiring long human-readable stories
- an unrestricted autonomous coding agent

---

## The model

### Intent records

The primary human input is compact and outcome-oriented:

```json
{
  "id": "invite-member",
  "goal": "Allow workspace owners to invite teammates",
  "outcome": "A workspace owner can create and manage invitations",
  "rules": [
    "Email must be valid",
    "Existing members cannot be invited",
    "Invitations expire after 7 days"
  ],
  "depends_on": ["workspace"],
  "priority": 1
}
```

`depends_on` is a module-level edge (`intent_dependencies`), mined from
the PRD Glossary's cross-module FKs before any task exists — see
[Mapping BMAD output to intents](#mapping-bmad-output-to-intents).

An intent record holds: goal, desired outcome, business rules,
constraints, acceptance conditions, priority, and dependencies on other
intents. The engine normalizes this into structured rows rather than
asking an AI to re-parse prose on every task.

## Core definitions

A **core definition** supplies the layer sequence a project builds in.
The engine itself is generic — it knows nothing about schemas or
controllers. It reads layers, their order, their file scope, and their
verification command as data.

```yaml
# a core definition — shipped or authored, same format either way
id: full-stack-app
layers:
  - id: schema
    scope: ["packages/db/src/schema/**"]
    verify: "pnpm nx test db && pnpm typecheck"
    commit: "feat({module}): schema"
  - id: contract
    depends_on: schema
    scope: ["packages/contracts/src/**"]
    verify: "pnpm nx test contracts && pnpm typecheck"
    commit: "feat({module}): contract"
  - id: repository
    depends_on: contract
    scope: ["libs/{module}/repository/**"]
    verify: "pnpm nx test {module}-repository"
    commit: "feat({module}): repository"
  # … service → controller → hook → screen
```

Two sources, identical treatment by the engine:

- **Golden Cores** — shipped, pre-verified, opinionated. `full-stack-app`
  and `landing-page` today. These carry Hedgehog's architectural
  opinions and need no interview.
- **Authored cores** — when no shipped core fits the project, `planner`
  runs the BMAD shelf and then `hedgehog-core-design`, which designs the
  layer sequence from that planning material and writes
  `.hedgehog/core.yaml`. Hedgehog decides the architecture; the user
  confirms it. The design is opinionated: a layer without a `scope` or
  without a `verify` command is rejected. A weaker guarantee than a
  Golden Core (the sequence was designed for one project, not
  battle-tested) but the same enforcement: ordered layers, scoped file
  access, verification before completion.

The engine cannot tell a shipped core from an authored one. Golden Cores
are strong defaults, not a closed set.

## The build graph

Compiling an intent against a core definition yields task nodes and
dependency edges:

```text
INTENT  "Invite teammates"
   │
   ├── requirement: invitation belongs to a workspace
   ├── requirement: invitations expire after 7 days
   │
   ▼
DB-INVITATION-01     schema       ready
   ▼
CT-INVITATION-01     contract     blocked
   ▼
RP-INVITATION-01     repository   blocked
   ▼
SV-INVITATION-01     service      blocked
   ▼
API-INVITATION-01    controller   blocked
   ▼
UI-INVITATION-01     screen       blocked
```

Every node knows: which intent it serves, which requirements it
satisfies, what it depends on, which files it may touch, which
architectural rules apply, how completion is verified, and what unlocks
on success.

Requirement linkage is whole-intent, not per-layer: compiling an intent
links every task it produces to all of that intent's requirements
(`task_requirements`). The compiler has no basis for splitting them —
"invitations expire after 7 days" constrains the schema, the service, and
the screen alike — so each task packet shows the worker every rule its
intent is bound by, and `hedgehog why` can always name the requirement a
file satisfies.

## Task lifecycle

```text
proposed → planned → ready → (agent works) → hedgehog verify
                                                    │
                        ┌───────────────────────────┼───────────────────┐
                        ▼                           ▼                   ▼
                   implemented                   verified            failed
                 (scope violation:                  │              (diagnostics
                  verification never                ▼               retained,
                  ran, no verifications          complete          dependents
                  row written)                      │              stay blocked)
                        │                           ▼
                        └──── fix, re-verify ──▶ unlocks dependents
```

A task becomes `ready` only when every dependency is `complete`.
Verification failure preserves the diagnostic output and leaves
dependents blocked — there is no path to `complete` that skips
`verified`.

Every status here is one the engine writes. `implemented` is
specifically the scope-violation state: `hedgehog verify` refused to run
the verification command because a touched path fell outside
`scope_globs`. Neither `implemented` nor `failed` is pickable by
`hedgehog next`, so both are surfaced by `hedgehog next` and `hedgehog
status` under NEEDS ATTENTION with the id to re-verify; fixing the work
and re-running `hedgehog verify <task-id>` is the only way forward from
either.

### Intent lifecycle

Intents move on the same principle as tasks — status is a consequence of
graph state, never an agent's assertion:

- `proposed` — added by `hedgehog intent add`, not yet compiled.
- `active` — `hedgehog plan` has compiled it into tasks.
- `complete` — every task compiled from it is `complete`. Set by
  `hedgehog verify` when it completes the intent's last open task.

`complete` is terminal bookkeeping, not a cleanup trigger: the intent's
tasks, verifications, and artifacts stay exactly where they are as the
provenance trail (see [Traceability](#traceability)).

---

## The runtime

### SQLite as build state

State lives in `.hedgehog/hedgehog.db`, **committed to git**.

This is viable because a Hedgehog build is single-agent, single-branch,
with no human hand-edits and no concurrent writers — so the usual
objections to a binary state file (merge conflicts, diff review) do not
apply. Committing it means state survives `/clear`, machine moves, and
reclone.

What SQLite buys over text files:

- **Constraints do enforcement work prose cannot.** A `CHECK` on status
  transitions, an FK on `depends_on`, `NOT NULL` on `verify_command` make
  it structurally impossible to create a task with no verification, or to
  mark one complete while a dependency is open.
- **Targeted queries instead of loaded documents.** "Which tasks are
  ready" is a query returning three rows, not a Markdown file read into
  context.

### Schema

```sql
CREATE TABLE intents (
  id          TEXT PRIMARY KEY,
  goal        TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 100,
  status      TEXT NOT NULL DEFAULT 'proposed'
              CHECK (status IN ('proposed','planned','active','complete')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE requirements (
  id          TEXT PRIMARY KEY,
  intent_id   TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('rule','constraint','acceptance')),
  statement   TEXT NOT NULL
);

-- module-level dependency, mined from the PRD Glossary — precedes any
-- task; the compiler orders task generation across intents by this edge
CREATE TABLE intent_dependencies (
  intent_id            TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  depends_on_intent_id TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  PRIMARY KEY (intent_id, depends_on_intent_id),
  CHECK (intent_id <> depends_on_intent_id)
);

CREATE TABLE tasks (
  id             TEXT PRIMARY KEY,
  intent_id      TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  module         TEXT NOT NULL,
  layer          TEXT NOT NULL,          -- from the core definition
  objective      TEXT NOT NULL,
  scope_globs    TEXT NOT NULL,          -- JSON array; files the agent may touch
  verify_command TEXT NOT NULL,          -- NOT NULL: no task without verification
  commit_message TEXT NOT NULL,
  priority       INTEGER NOT NULL DEFAULT 100,
  status         TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed','planned','ready',
                                   'implemented','verified',
                                   'complete','failed')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE task_requirements (
  task_id        TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, requirement_id)
);

CREATE TABLE dependencies (
  task_id            TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE artifacts (
  id        INTEGER PRIMARY KEY,
  task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  path      TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('created','modified')),
  commit_sha TEXT
);

CREATE TABLE verifications (
  id         INTEGER PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  command    TEXT NOT NULL,
  exit_code  INTEGER,
  output     TEXT,                        -- retained on failure for diagnostics
  status     TEXT NOT NULL CHECK (status IN ('passed','failed')),
  ran_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE friction (
  id        INTEGER PRIMARY KEY,
  task_id   TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  note      TEXT NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

A task is `ready` when it has no dependency whose status is not
`complete`:

```sql
SELECT t.* FROM tasks t
WHERE t.status = 'planned'
  AND NOT EXISTS (
    SELECT 1 FROM dependencies d
    JOIN tasks dep ON dep.id = d.depends_on_task_id
    WHERE d.task_id = t.id AND dep.status <> 'complete'
  )
ORDER BY t.priority, t.id
LIMIT 1;
```

## The CLI is the only writer

`hedgehog` (the existing npm bin, extended) owns every state transition,
using `node:sqlite` — Node's built-in SQLite, no dependency.

Agents **read** freely via `sqlite3` or the CLI's read commands. Agents
**never write**. This is the enforcement boundary: an agent cannot flip
its own task to `verified`, because the only code path to `verified` runs
the verification command first and records the exit code.

```bash
hedgehog intent add "Allow workspace owners to invite teammates"
hedgehog plan                    # compile intents × core → tasks + edges
hedgehog next                    # emit the task packet for one ready task
hedgehog verify <task-id>        # run checks; on pass: verified → unlock
hedgehog status                  # graph overview
hedgehog why <path>              # provenance for a file
```

### `hedgehog next`

`hedgehog next` emits the task packet itself — one command, one thing the
worker receives:

```text
TASK  DB-INVITATION-01
Create Invitation schema

STATUS   READY

INTENT
  Allow workspace owners to invite teammates
  A workspace owner can create and manage invitations

RELEVANT RULES
  - An invitation belongs to a workspace.
  - Invitations expire after 7 days.

WHY NOW
  ✓ Intent "invite-member" compiled into the graph
  ✓ Domain model resolved
  ✓ No incomplete dependencies

BLOCKED DOWNSTREAM
  ✗ CT-INVITATION-01   contract
  ✗ RP-INVITATION-01   repository
  ✗ SV-INVITATION-01   service
  ✗ UI-INVITATION-01   screen

ALLOWED SCOPE
  packages/db/src/schema/invitations.ts

VERIFICATION
  pnpm nx test db && pnpm typecheck
```

### The task packet

Assembled by query, never hand-written, never the whole plan:

```text
TASK: Add Invitation schema

Intent
  Allow workspace owners to invite teammates.

Relevant rules
  - An invitation belongs to a workspace.
  - Invitations expire after 7 days.

Architecture
  Drizzle · PostgreSQL
  schema → contract → repository → service → controller → UI

Allowed scope
  packages/db/src/schema/invitations.ts

Expected
  invitations table · workspaceId FK · email · expiresAt

Do not modify
  API · UI · unrelated domain modules

Verify
  pnpm nx test db && pnpm typecheck

On success
  mark DB-INVITATION-01 verified
  unlock CT-INVITATION-01
```

### `hedgehog verify`

1. Reads `verify_command` for the task.
2. Runs it.
3. On pass: writes a `verifications` row, sets `verified`, records
   touched files as `artifacts`, commits with `commit_message`, sets
   `complete`, re-evaluates dependents to `ready`.
4. On fail: writes the failing row **with output retained**, sets
   `failed`, leaves dependents blocked.

An agent reporting success does not move the task. Only a passing exit
code does.

## Architecture enforcement

The engine enforces, rather than explains:

- A task cannot be scheduled before its dependencies are `complete`.
- An agent may only touch files matching the task's `scope_globs`.
- Every task has a verification command (`NOT NULL`).
- Layer order comes from the core definition, not from an agent's reading
  of a Markdown table.
- Cross-layer violations (a service bypassing a repository) remain the
  `reviewer` agent's judgment call, backed by Nx boundary rules.

### Scope enforcement is a hard pre-verification check

Telling an agent its allowed scope in the task packet is advisory — it
trusts compliance, which is the exact failure mode the graph exists to
remove. `hedgehog verify <task-id>` enforces it structurally, before
running the verification command:

1. `git diff --name-only` (working tree) against the task's `scope_globs`.
2. Any touched path outside scope: **refuse to run verification at all.**
   The task stays `implemented`, not `failed` — this is a scope
   violation, not a failing check, so it doesn't write a `verifications`
   row or look like a broken test to `hedgehog status`.
3. Only once every touched path matches `scope_globs` does `verify_command`
   run.

This makes scope a gate the same shape as dependency-readiness and
verification itself — structural, not a suggestion in a prompt.

## Traceability

Every artifact traces back to intent:

```text
packages/db/src/schema/invitations.ts
        ↑ artifact of
DB-INVITATION-01  (verified: pnpm nx test db, exit 0)
        ↑ satisfies
requirement: "An invitation belongs to a workspace"
        ↑ of
intent: invite-member
```

`hedgehog why <path>` answers: why does this file exist, which intent
required it, which requirement does it satisfy, which task built it, what
verification proved it, and what breaks if the requirement changes.

A `complete` intent is never deleted — its `tasks`, `verifications`, and
`artifacts` rows *are* this provenance trail, and `dependencies`/
`task_requirements` cascade off `tasks.id` and `intents.id` respectively,
so deleting a completed intent would silently erase the audit history
`why` depends on. Completion is a terminal status, not a cleanup trigger:
a `complete` intent's tasks are all `complete`, so the readiness query
never resurfaces them — they're simply inert, not gone.

### Mapping BMAD output to intents

The vendored shelf (`hedgehog-planning-intake`, Phase 0) runs six
skills — brainstorming, product brief, PR-FAQ, PRD, UX spec, deep-recon —
into `.hedgehog/BMAD/`. Only two of those six are ever read again:

- **The PRD (`04-prd.md`)** is the mining source. It is the only
  artifact shaped like graph rows: §4 Features nest Functional
  Requirements, each FR carries a testable "Consequences" list; §3
  Glossary states entities, relationships, and cardinality.
- **The UX spec (`05-ux-spec/`)** is read later, once per module, by
  `ux-planner` — not by the mining pass.

Brainstorming, product brief, PR-FAQ, and deep-recon exist to produce a
good PRD; once the PRD exists their value is spent. They stay archived
in `.hedgehog/BMAD/` (immutable, per Phase 0's existing rule) but are
**out of scope for mining** — nothing mechanical reads them again. This
also bounds the token cost of intake: the graph's structured rows are
the durable form, so the elicitation prose that produced them doesn't
need a second life as mining input.

Mining `04-prd.md` is mechanical, not interpretive:

| PRD element | Graph row |
| --- | --- |
| §4 Feature | one `intents` row — a feature's description already reads as `goal` + `outcome` |
| FR "Consequences (testable)" item | `requirements` row, `kind='acceptance'` |
| Feature-specific NFR / cross-cutting rule | `requirements` row, `kind='rule'` |
| §3 Glossary relationship/cardinality | `intent_dependencies` row (module dependency, before any task exists) |

Mining becomes "one intent per Feature, one requirement per Consequence
and per rule," not free-form judgment.

---

## What changes in this repo

| Area | Change |
| --- | --- |
| `bin/cli.mjs` | Extend from installer to installer + engine: `intent`, `plan`, `next`, `verify`, `status`, `why`. Uses `node:sqlite`. |
| `src/templates/TODO.md`, `TODO.core.*.md` | **Deleted.** The graph replaces them. |
| `src/templates/CLAUDE.md` | "Consuming TODO.md" → "Consuming the graph": read via `hedgehog next`, never re-derive state. Context guidance stays. |
| `src/skills/hedgehog-loop` | The step tables become the shipped `full-stack-app` core definition (data). The skill keeps phase rules, intra-step conventions, and the Correction Protocol — the judgment the engine can't encode. |
| `src/agents/planner.md` | Phase 0 core selection gains a third outcome: no shipped core fits → run BMAD Phase 0, then `hedgehog-core-design` authors `.hedgehog/core.yaml`. Mines the PRD into intent records via `hedgehog intent add` instead of writing a `TODO.md` checklist. |
| `src/skills/hedgehog-planning-intake` | Phase 1 mining reads `04-prd.md` only (§3 Glossary, §4 Features/FRs) — not the full `.hedgehog/BMAD/` archive. Brainstorming/brief/PR-FAQ/deep-recon stay archived, never read again. Mining table changes from scope-boundary/domain-modules prose to the PRD→graph-row mapping above. |
| `src/agents/backend-eng.md`, `front-end-eng.md` | Receive a task packet, not a step name. Honor `scope_globs`. Report evidence; never self-certify. |
| `src/agents/reviewer.md` | Unchanged in purpose — still the judgment layer at phase transitions and Correction Protocol. |
| `src/agents/tweaker.md` | Friction log moves from `.hedgehog/friction.md` to the `friction` table. |
| Golden Cores | Both become shipped core definitions consumed by the compiler, not the definition of Hedgehog itself. |
| `src/skills/hedgehog-landing-loop` | The five-phase chain becomes the shipped `landing-page` core definition (a linear chain, no module axis). The skill keeps the Chain Method's judgment content — brief mining, feeling/token derivation, critic pass. |

```text
Hedgehog Execution Engine
├── Intent
├── Planner / compiler
├── SQLite build graph
├── Task scheduler
├── Task packets
├── Verification
└── Provenance
     ├── Golden Core: full-stack-app   (shipped)
     ├── Golden Core: landing-page     (shipped)
     └── Authored core                 (.hedgehog/core.yaml)
```

---

## MVP

The first proof:

> Given a compact intent, Hedgehog produces a correctly ordered sequence
> of small AI tasks, persists progress, and structurally prevents the AI
> from skipping architectural layers or self-certifying unverified work.

Scope:

1. `.hedgehog/hedgehog.db` with the schema above, committed.
2. Intent records via `hedgehog intent add`.
3. A task compiler reading a core definition.
4. The shipped `full-stack-app` core definition — layers repeat per
   domain module (`schema → contract → repository → service →
   controller → hook → screen`, module × layer = one task).
5. The shipped `landing-page` core definition — the Chain Method's five
   phases (`brief → feeling → tokens → sequence → artifact`) expressed as
   a single linear chain with no per-module repetition: one task per
   phase, each depending on the one before it. Same task/dependency
   tables, same `hedgehog next`/`verify` path; the compiler treats a
   linear chain as the degenerate case of a layer graph (each phase
   depends only on its immediate predecessor, no module axis).
6. `hedgehog next` emitting task packets for either core.
7. `hedgehog verify` running checks and gating transitions, including the
   scope pre-check.
8. Dependent unlocking.
9. Task→file provenance.

Not in the MVP: a project-management UI, multi-agent orchestration,
autonomous repo-wide planning, code generation per layer, indexing
existing (non-Hedgehog-built) code into the graph — Hedgehog targets new
projects, the same assumption BMAD makes.

## Open questions

Hedgehog targets new, AI-only-built projects — no human hand-edits, no
existing codebase to index (the same assumption BMAD makes). That
removes reconciliation with manual changes and adoption-time indexing as
concerns. Scope enforcement, BMAD-to-intent mapping, and completed-intent
retention are resolved above. What's left:

- How is an already-`complete` intent **amended** when a requirement
  changes after the fact — reopen it (`complete` → `active`, task
  statuses reset for affected layers only) or always model it as a new,
  dependent intent? Reopening risks re-running verification against
  since-changed downstream code; a new intent keeps history clean but
  fragments a single feature across multiple intent rows.

  Until this is settled, the engine has no amendment path: `hedgehog
  plan` only compiles `proposed`/`planned` intents, so a `complete` one
  is inert rather than reopenable, and nothing silently resets verified
  work. A changed requirement is modelled as a new intent today.
