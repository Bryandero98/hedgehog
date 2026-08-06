---
name: hedgehog-authored-loop
description: Use for every unit of work on an authored core (`.hedgehog/core.yaml` present) once bootstrap has closed — building one layer per `hedgehog next` packet, gated by `hedgehog verify` and committed one layer at a time. Triggers on "next step", "what's next", "build this", or the start of any work session on a bootstrapped authored-core project. Also covers the Correction Protocol and the Stop Condition for this core.
---

# Hedgehog Authored Loop

The operating loop for a bootstrapped project on an authored core:
`hedgehog next` emits the packet for one ready layer, `layer-eng` builds
it, `hedgehog verify` gates and commits it. The build graph
(`.hedgehog/hedgehog.db`) is the live list — query it via `hedgehog
status`/`hedgehog next`, never re-derive state from prose.

## Where this core's shape lives

An authored core's layer sequence and stack were designed for this
project by `hedgehog-core-design`. Two files carry them, and both are
locked:

- **`.hedgehog/core.yaml`** — the compiled authority: layer order, each
  layer's `scope` globs, `verify` command, commit message. `hedgehog
  plan` compiled the graph from it; every packet is generated from it.
- **`.hedgehog/core-design.md`** — the rationale: system shape, stack,
  what each layer owns and why it sits where it does, and the module-axis
  decision.

Read `core-design.md` at the start of a session to know what this project
is; trust `core.yaml` and the packet as authoritative if the two ever
seem to disagree.

## Module axis

`hedgehog-core-design` decided one of two graph shapes, recorded in
`core-design.md`:

- **Module axis** — the layer chain instantiates once per intent, so the
  graph is intents × layers. A packet's `module` field names which intent
  the layer is being built for, and scope globs carry `{module}` filled
  in. Every intent walks the full sequence.
- **Linear chain** — one pass total, one task per layer, no `module`
  dimension. The project is built once, front to back.

`hedgehog next` handles both — it emits whatever is ready. This matters
for reading `hedgehog status`: on a module axis, "done" means every
intent completed every layer, not the last layer completed once.

## The Loop (every unit of work)

1. **Run `hedgehog next`.** It emits the task packet for one ready layer
   (STATUS/INTENT/RELEVANT RULES/WHY NOW/BLOCKED DOWNSTREAM/ALLOWED
   SCOPE/VERIFICATION) — trust it: `hedgehog next` never emits a layer
   whose dependencies aren't `complete`, so there's no separate gate
   check to run by hand.
2. **Delegate the full packet** (not a layer name) to `layer-eng`, along
   with the reminder to read `.hedgehog/core-design.md` for what its
   layer owns.
3. The agent **runs the packet's VERIFICATION command on its own work**
   as a sanity check before reporting back — necessary, not sufficient.
   The agent reports the work as done; it does not move the task and does
   not commit.
4. **Run `hedgehog verify <task-id>`.** It checks the touched files
   against the packet's ALLOWED SCOPE, runs the layer's VERIFICATION
   command, and on a pass writes the commit (the exact message from
   `core.yaml`, plus the updated build graph) and unlocks the next layer.
   On a scope violation or a failing check, the task stays
   `implemented`/`failed` and nothing downstream unlocks — fix it and
   re-run `hedgehog verify <task-id>`, don't hand-commit around it.

   A stalled task is not pickable by `hedgehog next`, so both `hedgehog
   next` and `hedgehog status` list it under NEEDS ATTENTION with the
   task id to re-verify. If `hedgehog next` reports the graph blocked,
   fix that task — don't treat it as "nothing left to do."
5. **Repeat** — `hedgehog next` again for the following layer.

Each `hedgehog verify` call commits exactly one layer, built right for
what's known now; a wrong layer is fixed forward later via the Correction
Protocol.

## Intra-layer conventions

An authored core's stack varies by project, so the conventions inside a
layer come from two places rather than a fixed table: the stack's own
idioms (a Rust project's error handling is `Result`, a TypeScript
project's is thrown typed errors), and whatever the earlier layers
already established on disk. Read before writing, and stay consistent
with what's there.

Three hold on every authored core regardless of stack:

- **A layer owns one artifact, reached through the interface
  `core-design.md` named.** The layer below is consumed through that
  interface, not reached around — the boundary is what makes the layer
  independently verifiable.
- **Errors carry their meaning.** A failure surfaces as the stack's
  idiomatic typed failure with a domain-meaningful name, not a bare
  string or a silent empty return a caller has to guess at.
- **Each layer's tests live inside that layer's scope** and run under its
  own `verify` command. A layer whose command passes with no tests
  certifies nothing.

## Friction log

Real friction during a build — an agent's instructions were unclear, a
redline had to be issued twice for the same underlying gap, the user had
to correct the same kind of mistake more than once, or user feedback
implied something was wrong even without a direct correction — is signal
worth keeping past this session, separate from the Correction Protocol
that fixes it in the moment. Log one entry via `hedgehog friction add
"<note>" [--task <task-id>]` when that happens: what was tried, what went
wrong or was implied, why if visible, and the commit/message it traces
to, all in the note text; pass `--task` with the layer's task id when the
friction traces to one. This is a log, not a todo list — don't let it
block or slow the Loop; log and keep moving. `tweaker` reads it (via
`hedgehog friction list`) once the build reaches its Stop Condition.

An authored core's own layer sequence is a live subject for this log: a
layer that keeps needing scope it doesn't have, or two layers that are
always touched together, is design feedback worth recording even when the
Correction Protocol resolves the immediate case.

## Correction Protocol

When a downstream layer reveals an upstream layer was wrong:

1. Stop.
2. Patch the upstream layer directly, in place.
3. Fast-forward every dependent layer that breaks, each its own small
   commit. If the patched layer produces a build artifact that downstream
   layers or a running dev process consume (a compiled package, a
   generated client, a bundled asset), rebuild it before re-verifying —
   an unbuilt patch looks unchanged to anything reading the built output.
4. The commit messages are the explanation.
5. Resume the loop.

The orchestrating session runs this protocol. A layer-owning agent that
hits the problem reports it rather than correcting across layers: the
commits at step 3 are the session's act, the same way `hedgehog verify`
always is.

Use `conventional-commits` when a correction touches several layers in
one working-tree pass and needs splitting back into per-layer commits.

When the correction is to the **layer sequence itself** — a layer in the
wrong place, a missing layer, a scope glob that never fits — that's a
`planner` case, not a patch: `.hedgehog/core.yaml` and
`.hedgehog/core-design.md` are locked, and changing them re-shapes every
task the graph compiles. Stop, say what the design got wrong, and hand to
`planner`.

### Post-build entry

The protocol also runs after a build has reached its Stop Condition, when
a `tweaker` session finds that something structural is wrong rather than
something small (`tweaker` routes it here). Steps 2, 3, and 4 are
unchanged. The two ends differ:

- There is nothing to **stop** — no task is in flight. Start by naming
  which committed layer was wrong and what revealed it.
- There is no loop to **resume**: every task is already `complete`, so
  `hedgehog next` has nothing to emit. Return to the `tweaker` session
  instead.

Every task the correction touches is already `complete` and stays that
way — a correction is fixed forward in new commits, never by reopening a
finished task. Verify each patched layer with its own `verify` command
from `.hedgehog/core.yaml`. Log the correction with `hedgehog friction
add` so the next friction review sees what the build got wrong.

## Layer Transition Checks

Before starting a layer that depends on an earlier one, confirm the
earlier layer's task is `complete` in `hedgehog status` — `hedgehog next`
already guarantees this, so this check matters only when picking work up
by hand after an interruption.

Use the `reviewer` agent at the point a layer closes for the last intent
on a module axis, or at the last layer on a linear chain — it checks what
the mechanical gate can't: whether the layer boundary `core-design.md`
described actually held, and whether the interfaces between layers stayed
the ones that were designed.

## Rules

- **Sequential within the chain.** A layer starts once the one before it
  passes its own verification.
- **A wrong layer gets fixed at its source** — the Correction Protocol,
  not a downstream workaround.
- **The layer's own `verify` command gates every commit.** Never weaken
  it to clear a gate.
- **Scope is the boundary.** A layer writes inside its ALLOWED SCOPE and
  nowhere else; a change that needs to land elsewhere is a correction,
  not a wider write.
- **`.hedgehog/core.yaml` and `.hedgehog/core-design.md` are locked.**
  Changing either is a `planner` decision through the Correction
  Protocol.

## Stop Condition

A build session ends when `hedgehog status` shows every task `complete`
(on a module axis: every intent through every layer), or when scope is
ambiguous enough that continuing means guessing — ask one question and
wait.

On the former (a real build completion, not an ambiguity stop), offer a
fresh-context handoff before doing anything else: tell the user the build
is complete, and that clearing context now costs nothing (the build graph
and the commit log hold everything). Nothing gets deleted at completion —
`.hedgehog/hedgehog.db` stays committed as the permanent record, and it's
what makes the next session cheap.

Name **both** ways forward, because which one applies depends on what the
user wants next:

- **Adjustments to what's built** — a `tweaker` session, in a *new* chat
  window, not a subagent call inside this one — this session's context
  has been building the whole project and is exactly what "clearing
  context now costs nothing" above means to discard. Tell the user
  plainly: close this chat window and open a new one, then paste this to
  start it:

  > The build is complete. Use the tweaker agent: first review the
  > friction log and ask me for feedback on the build, then take my
  > tweak requests one at a time.

  In the new window, `tweaker` picks up post-build tweaks and friction
  review from a clean context.
- **New scope** — a new intent on the module axis, anything beyond
  adjusting what exists — goes to `planner`, which runs
  `hedgehog-planning-intake`'s Re-entry pass: it adds intents for the new
  work without re-running planning from scratch, compiling them through
  the layer sequence `.hedgehog/core.yaml` already defines, and without
  disturbing anything already built. A completed build is extendable, not
  sealed. Changing the **layer sequence itself** is the separate case
  above — a Correction Protocol entry, not a re-entry pass.
