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
lives in this core's own planning-intake output and `TODO.md`, not
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
session starts with `TODO.md`, not a greeting.

## How to work here

The build is a loop of small, gated, committed steps. You never hold the
whole plan in context — the plan lives in the structure:

- **`TODO.md`** is the live checklist and the source of truth for what's
  next. Read it at the start of every session. Its only state is
  checked/unchecked (or skipped-and-confirmed, wherever this core's own
  optional steps allow it).
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

## Consuming TODO.md

`TODO.md` at repo root is a thin checklist mirroring this core's phase/
step structure. To work from it:

1. Read it. Find the first unchecked step whose gate (the step before it)
   is satisfied.
2. Build that one step via this core's loop skill (named in the section
   above).
3. Check the line off after the commit lands. Checked/unchecked is the
   only state — no notes, no rationale (that's the commit log's job).

`planner` owns writing and extending `TODO.md`; the loop only checks
boxes off. Keep it thin.

**When the build is done:** once every item in scope is checked, the
build session is complete. Before deleting `TODO.md`, offer the user a
fresh-context handoff to the `tweaker` agent — it starts clean, reviews
`.hedgehog/friction.md` once for a possible discipline-improvement
suggestion (filed as a GitHub issue against the Hedgehog repo itself,
never this project's repo, and only after showing the exact content and
getting explicit approval), then takes any tweak requests one at a time.
Once that handoff is offered (taken or declined), **delete `TODO.md`** —
a finished checklist is noise, and the commit log is the durable record
of what was built. Any archival planning-intake output this core
produces stays — it's historical record, not a checklist.

## Managing context

Hedgehog is designed so the conversation is disposable. Keep the working
context small:

- **Clear context at natural boundaries** — a module's Phase A, a
  landing page section, whatever this core's own unit boundary is — once
  that unit is done and committed. `/clear` and start fresh, then
  re-read `TODO.md` and continue. Nothing is lost, because the
  checklist, commits, and code hold all the state. Prefer this over
  letting one session accumulate the entire project.
- **A cleared or new session recovers by reading `TODO.md` and the
  commit log**, never by needing the prior conversation.
- **Delegate heavy work to agents.** Planning intake, scaffolding, and
  every build step each run in their own isolated context — so that work
  doesn't pile up in the main thread.
- **Don't paste large context back in.** If you find yourself
  re-explaining the architecture, stop — it's fixed and stated in this
  file's core section, not something to reconstruct. If you need a
  project specific, read it from the code. That's the self-documenting
  design working as intended.
