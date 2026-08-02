---
name: hedgehog-core-design
description: Use on full-stack-app and landing-page alike only when neither shipped Golden Core fits a project that is still building something real — picks the stack and designs the layer sequence for it, and writes `.hedgehog/core.yaml`. Invoked by the `planner` agent as Phase 0's third outcome, after the vendored BMAD shelf has run; don't run standalone and don't run when a shipped core fits.
---

# Hedgehog Core Design

Designs a core definition for a project no shipped Golden Core fits.
Hedgehog decides the architecture here — the stack, the layers, their
order, their file scope, their verification — and shows it back for
confirmation. The user is asked about their product, never asked to pick
a stack or design layers; a person who could name the right stack and
layer sequence unprompted wouldn't need a build discipline to enforce it.

The output is one file, `.hedgehog/core.yaml`, in the exact format
shipped cores use (spec: "Core definitions"). Everything else this skill
produces is rationale, and rationale goes to `.hedgehog/core-design.md`,
not into `core.yaml` — the loader (`src/db/core.mjs`) parses a narrow
YAML subset and throws on anything outside it.

## When this runs

After `hedgehog-planning-intake`'s Phase 0, not before. An architecture
can't be designed from a one-line project description: the drivers that
decide it — persistence, concurrency, deployment target, integration
surface — are exactly what BMAD's brief and PRD elicit. So `planner`'s
Phase 0 reaches its third outcome ("neither shipped core fits, but
something is being built"), runs the BMAD shelf in full, then opens this
skill against that archive. Intent mining follows this skill, not the
other way round — the layer sequence has to exist before `hedgehog plan`
can compile anything against it.

## Step 1 — name the system shape

Say what the project fundamentally is, in one line, before deriving
anything from it: a CLI, a library or SDK, a data pipeline, a browser
extension, a desktop app, a compiler or language tool, a bot or agent, a
game, an infrastructure/deploy tool. Pick the dominant one. A project
with several surfaces has one primary system and the rest are layers
inside it, not co-equal architectures.

This is the step that catches a misrouted Phase 0. If the shape you land
on is "a web app with a database behind it," that is `full-stack-app` and
you should say so and route back rather than author a near-copy of a
shipped core under a new name. The same goes for a marketing page that
grew a second page — still `landing-page`.

## Step 2 — pick the stack

Name the language, package manager, and the one or two frameworks that
shape the architecture (a web/CLI/RPC framework, not every library the
project will eventually need) before deriving layers — a layer's `verify`
command can't be written until the test runner and build tooling are
decided, and layer boundaries themselves often follow framework
conventions (e.g. a middleware layer only exists if the framework has
middleware). Don't ask the user to choose — the same reasoning Step 1
applies to layers applies here: naming a stack is exactly what a build
discipline exists to decide unprompted, and asking would just relocate
the design work onto the person who came here to avoid doing it.

Pick one default per system shape, the same way the shipped cores commit
to one choice per row rather than a menu (`hedgehog-bootstrap`'s stack
table). Substitute off a default only for a concrete, named constraint
read from `.hedgehog/BMAD/` — never a general preference for variety:

| System shape | Default stack | Substitute when |
|---|---|---|
| CLI | TypeScript + Node, Commander, Vitest, pnpm | the target users are a Python-first or Go-first ecosystem (data/ML tooling → Python + Typer + pytest; infra/systems tooling → Go + Cobra + `go test`) |
| Library / SDK | TypeScript, tsup, Vitest, pnpm | the consuming ecosystem is fixed by the brief (a Python package → Python + Hatch + pytest; publishing to both → author the TS core first, wrap it) |
| Data pipeline | Python, stdlib/argparse or Dagster for orchestration, pytest, uv or pip | the pipeline is thin glue over an existing Node/TS service mesh already named in the brief |
| Browser extension | TypeScript + WXT (bundles the content-script/background/popup entry points and the WebExtension API types), Vitest, pnpm | none in practice — this shape has one real ecosystem |
| Desktop app | TypeScript + Electron, Vitest + Playwright, pnpm | native platform integration is a stated hard requirement (macOS/Windows-only, deep OS API use) → Swift/AppKit or C#/WinUI, per platform, named explicitly |
| Compiler / language tool | Rust, `cargo test`, Cargo | the brief is explicitly about fast iteration over raw performance, or targets a JS/TS-only toolchain (a Babel/ESLint plugin) → TypeScript, Vitest, pnpm |
| Bot / agent | TypeScript, Vitest, pnpm | the brief calls for heavy ML/data-science library use → Python, pytest, uv |
| Game | TypeScript + a canvas/WebGL engine already named in the brief (e.g. PixiJS, Three.js), Vitest, pnpm | a native/console target is explicit → the engine's native language (C#/Unity, C++), named per that engine |
| Infra / deploy tool | Go, `go test`, Go modules | the tool is a thin wrapper generating config/manifests with no systems-level need → TypeScript, Vitest, pnpm |

A shape not on this table is rare enough that no default has been
battle-tested — reason from the same drivers `hedgehog-bootstrap`'s
table encodes (ecosystem the target users already live in, deployment
target, the language the brief's own examples or comparables are
written in) and name the result as a judgment call, not a table lookup,
in `core-design.md`'s rationale.

Record the choice as one line — language, package manager, the named
framework(s), test runner — before moving to Step 3; every layer's
`scope` and `verify` in Step 3 draws from it.

## Step 3 — derive the layers

Read `.hedgehog/BMAD/` for what the system actually does, then decide the
layers it builds in. A layer earns its place by owning a distinct
artifact that can be verified on its own. Order by dependency first (a
layer that another layer imports comes first) and by risk second (where
two layers are independent, build the one that would invalidate the other
if it went wrong first).

Three rules with teeth:

- **A layer with no executable verification is not a layer.** Fold it
  into its neighbour or drop it. `verify: manually inspect` is not a
  verify command, and the loader rejects an empty one outright
  (`validateCore`, `src/db/core.mjs`).
- **A layer whose file scope overlaps another layer's is not a layer.**
  Scope is what stops step N from quietly rewriting step N−1's work;
  overlapping globs make that enforcement meaningless.
- **Don't reproduce a Golden Core's sequence under new names.** If
  schema → contract → repository → service → controller is genuinely
  right, Phase 0 picked the wrong outcome.

Four to seven layers is the usual range. Fewer than three means the
project probably wanted a shipped core or no core at all; more than eight
means several layers are one layer with internal steps.

## Step 4 — decide the module axis

Answer explicitly, because it changes the shape of the whole graph:

- **Module axis** (like `full-stack-app`) — the layer chain instantiates
  once per intent. Every scope glob, verify command, and commit message
  that differs per module carries the `{module}` placeholder, which
  `hedgehog plan` fills with the intent's id (`src/db/plan.mjs`). The
  graph is intents × layers tasks.
- **Linear chain** (like `landing-page`) — one pass total, no `{module}`
  anywhere. The graph is one task per layer. Mine the project as a single
  intent.

Choose a module axis when the project has repeating units of domain work
that each walk the same layers (entities, commands, resources,
integrations). Choose a linear chain when the project is built once,
front to back.

Getting this wrong is the most common failure. A module-axis core whose
scopes omit `{module}` gives every intent identical scope globs, so
intent A's task may write intent B's files and the scope enforcement that
justifies authoring a core at all disappears. Check every glob before
writing the file.

## Step 5 — write `.hedgehog/core.yaml`

The loader parses `id` plus a `layers` list of flat maps. Every layer
needs all five fields — `depends_on` is omitted only on the first layer:

```yaml
id: cli-tool
layers:
  - id: command-model
    scope: ["src/commands/**"]
    verify: "pnpm test commands && pnpm typecheck"
    commit: "feat({module}): command model"
  - id: domain
    depends_on: command-model
    scope: ["src/domain/{module}/**"]
    verify: "pnpm test {module}-domain"
    commit: "feat({module}): domain"
  - id: adapter
    depends_on: domain
    scope: ["src/adapters/{module}/**"]
    verify: "pnpm test {module}-adapter"
    commit: "feat({module}): adapter"
```

Constraints the loader and compiler impose, all of them silent failures
if missed:

- **`commit` is required in practice**, though `validateCore` doesn't
  check it. `hedgehog plan` writes `commit_message` from it for every
  task (`src/db/plan.mjs`); a layer without one compiles to a task with
  an empty commit message, and the Correction Protocol and `hedgehog why`
  both hang off commit shape. Use the conventional-commit form every
  other core uses: `feat({module}): <layer>`, or `feat(<project>):
  <layer>` on a linear chain.
- **`scope` must be an inline list** — `["a/**", "b/**"]` on one line.
  Block sequences under `scope:` don't parse.
- **No nesting beyond a layer's flat fields.** Flat top-level keys other
  than `id` and `layers` are ignored, but any nested block
  (`architecture:`, `modules:`, `decisions:`) throws at load. Rationale
  belongs in `.hedgehog/core-design.md`.
- **`depends_on` names one layer**, and the chain must be acyclic. The
  compiler walks it directly into `dependencies` rows.

Verify the file loads before showing it back, by calling the loader
directly:

```bash
node -e "import('./src/db/core.mjs').then(m => m.loadCore('.hedgehog/core.yaml')).then(c => console.log(JSON.stringify(c, null, 2)))"
```

Read the layers it prints back: a field the parser dropped shows up as an
empty string or `[]` there, and a `{module}` you meant to include is
visible in the globs or absent from them. A `core.yaml` that throws at
load time is the one failure mode that strands a project with no path
forward.

## Step 6 — write `.hedgehog/core-design.md`

The rationale the engine doesn't read but the project needs: the system
shape and why, the stack and why (the default it came from, or the named
constraint that justified a substitution), the layers with a line each on
what they own and why they sit where they do, the module-axis decision,
and anything left unresolved. Written once, archival, never edited after
— the same stance `.hedgehog/BMAD/` takes. Later changes to the
architecture are Correction Protocol entries in the commit log, not edits
here.

## Confirm & Lock

Authoring a core is the most consequential decision in a Hedgehog project
— every task the graph ever compiles walks this sequence — and it's cheap
to change only until the file lands. Hard stop.

🔒 **Confirm & Lock**. Show, in full, not condensed:

- The system shape, in the one line from step 1.
- The stack: language, package manager, and named framework(s), plus
  whether it's the shape's default or a substitution — and if a
  substitution, the one-line constraint that justified it.
- Each layer in order: what it owns, its scope globs, its verify command,
  its commit message.
- The module-axis decision, named as such, with the consequence stated
  (intents × layers tasks, or one task per layer).
- That this is an authored core: the sequence was designed for this
  project, not battle-tested across many, and it carries the same
  enforcement as a Golden Core but a weaker guarantee.

Then state plainly what happens on confirmation, before it happens:

> This writes `.hedgehog/core.yaml` and `.hedgehog/core-design.md`, then
> planning intake mines the PRD into intents against this layer sequence.
> Every task this project ever builds walks these layers in this order.
> Anything wrong — say so now; it's a normal edit before this point, and
> a Correction Protocol entry after. Confirm to proceed, or tell me what
> to change.

Wait for an explicit go-ahead. A revision here is another design pass —
update the draft, re-run this stage, write nothing until the confirmation
holds. Once confirmed and written, control returns to `planner`, which
runs `hedgehog-planning-intake`'s Phase 1 mining against this core the
same way it would against a shipped one, then hands off to `bootstrap`.

This skill never touches the workspace itself — no `pnpm init`, no
generator, no install. `init` already scaffolded a default golden-core
payload speculatively before Phase 0 ever ran (the CLI has to copy
something; `full-stack-app` is that default), and this skill's job ends
at the design artifacts. `bootstrap`'s `hedgehog-bootstrap-authored-core`
is what later removes that speculative default and generates the real
workspace for the stack chosen here — a separate step, run only once
Phase 1 mining and Confirm & Lock have both landed.
