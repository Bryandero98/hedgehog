<!--
  Hedgehog project CLAUDE.md template.

  This file is copied into a consuming project's repo root at install
  time, with the core-section marker below filled in from this
  project's chosen core's own CLAUDE.core.<name>.md (src/templates/).
  Placeholders wrapped in {{ }} are filled in once, at planning intake,
  by the `planner` agent (or by hand). Everything outside the
  placeholders is a constant of the Hedgehog discipline and should be
  left as-is.

  Delete this comment block after the placeholders are filled in.
-->

# {{PROJECT_NAME}}

{{PROJECT_SUMMARY — 2–4 sentences the `planner` writes at planning
intake: what this project is, who it's for, and what it does. State
current intent, not history. Keep it tight — the full product narrative
lives in this core's own planning-intake output and the build graph, not
here.}}

This project is built with **Hedgehog**: a one-step-at-a-time build
discipline. The rules below aren't project preferences — they're how the
build stays mechanically correct. Follow them exactly.

## First message in a fresh install

If `{{PROJECT_SUMMARY}}` above is still an unfilled placeholder, this is a
brand-new install and nothing has been built yet. Open with something
short and warm — 🦔 plus one line asking what the user wants to build —
then hand straight to `planner`, which decides which Hedgehog core
applies and runs that core's planning intake. Don't re-explain the
discipline or summarize this file; the greeting is one line, not a tour.
Skip this entirely once the placeholder is filled in — every later
session starts with `hedgehog status`, not a greeting.

## How to work here

The build is a loop of small, gated, committed steps. You never hold the
whole plan in context — the plan lives in the structure:

- **The build graph** (`.hedgehog/hedgehog.db`) is the live source of
  truth for what's next. Query it via `hedgehog status`/`hedgehog next`
  at the start of every session — never re-derive state from prose.
- **The commit log** is the record of what's built and why. Conventional
  commits are how progress is read, not a conversation summary.
- **The architecture is fixed and opinionated for this project's core**
  — the same on every Hedgehog project running that core. Where a piece
  lives, what it may depend on, the build order: all of it is inferable
  from this file and the skills *without reading a line of code*. You
  don't discover the patterns; you already know them.
- **The codebase carries the project-specific instances** — what's
  actually been built, what a given piece's shape is, what's already
  wired. That, you re-read from the code when you need it, rather than
  remembering it.

Because state lives in those places and not in the conversation, a fresh
context loses nothing: the architecture is known a priori, and the
project's specifics are re-read on demand. Use that (see **Managing
context** below).

{{CORE_SECTION}}

## Consuming the graph

`.hedgehog/hedgehog.db`, committed to git, is the source of truth for
what's next — never re-derive build state from prose. To work from it:

1. Run `hedgehog next`. It emits the task packet for one ready task
   (STATUS/WHY NOW/BLOCKED DOWNSTREAM/ALLOWED SCOPE/VERIFICATION) —
   trust it: a task is never emitted unless every dependency is
   `complete`.
2. Delegate the full packet to this core's loop skill (named in the
   section above), which hands it to the owning agent.
3. Once the agent reports the work done, run `hedgehog verify
   <task-id>`. It checks the touched files against the packet's ALLOWED
   SCOPE, runs the verification command, and on a pass writes the commit
   and unlocks whatever the task was blocking. An agent reporting success
   never moves the task — only a passing `hedgehog verify` exit code
   does.

`planner` owns writing intents (`hedgehog intent add`) at planning
intake; `hedgehog plan` compiles them into the task graph the loop
consumes. Nothing checks a box — there is no checklist, only queryable
state.

**When the build is done:** once `hedgehog status` shows every task
`complete`, the build session is complete. Offer the user a
fresh-context handoff to the `tweaker` agent — it starts clean, once
reviews the friction log (`hedgehog friction list`) for possible
discipline-improvement issues and separately asks the user directly for
feedback on the build, filing each real pattern or piece of feedback as
its own GitHub issue against the Hedgehog repo itself, never this
project's repo (friction as `bug`/`help wanted`, feedback as
`suggestion`, each only after showing the exact content and getting
explicit approval), then takes any tweak requests one at a time. Nothing
to delete once that handoff is offered — the build graph and the commit
log are the permanent record, not a checklist to clean up.

## Managing context

Hedgehog is designed so the conversation is disposable. Keep the working
context small:

- **Clear context at natural boundaries** — a module's Phase A, a
  landing page section, whatever this core's own unit boundary is — once
  that unit is done and committed. Clear the conversation and start
  fresh, then run `hedgehog status`/`hedgehog next` and continue. Nothing
  is lost, because the build graph, commits, and code hold all the state.
  Prefer this over letting one session accumulate the entire project.
- **A cleared or new session recovers by running `hedgehog status` and
  reading the commit log**, never by needing the prior conversation.
- **Delegate heavy work to agents.** Planning intake, scaffolding, and
  every build step each run in their own isolated context — so that work
  doesn't pile up in the main thread.
- **Don't paste large context back in.** If you find yourself
  re-explaining the architecture, stop — it's fixed and stated in this
  file's core section, not something to reconstruct. If you need a
  project specific, read it from the code. That's the self-documenting
  design working as intended.

{{HOST_DISPATCH}}
