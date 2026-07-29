---
name: hedgehog-landing-loop
description: Use for every unit of work on the landing-page core, from planning intake through the final build phase — the Chain Method's brief → feeling → tokens/element → sequence → artifact pipeline, gated and committed one phase at a time, checked off TODO.md. Triggers on "next step", "next phase", "what's next", or the start of any work session on a bootstrapped landing-page project. Also covers this core's own planning intake and Correction Protocol.
---

# Hedgehog Landing Loop

The operating loop for a bootstrapped `landing-page` project: pick the
next phase, run it through its owning agent, gate it, commit it, check it
off. `TODO.md` at repo root is the live list — read it before starting.
It's thin: a context blurb plus a checklist mirroring the phase structure
below. Checked/unchecked is its only state.

This is the **Chain Method**: a pipeline where every visual choice traces
back to a reason. No agent may introduce a choice that doesn't originate
in the previous agent's output — that discipline is what this skill
enforces mechanically, the same role Nx module boundaries play for
`full-stack-app`.

## Planning intake (Phase 0, before any build phase)

Run once, before `bootstrap` scaffolds the workspace. Opens with
`hedgehog-planning-intake`'s Phase 0 — the same vendored BMAD-METHOD
shelf `full-stack-app` runs, in the same full sequence, archived to the
same `.hedgehog/BMAD/` layout. After that Phase 0 completes, this
section does its own mining — a one-paragraph subject statement, the
landing-page counterpart to `hedgehog-planning-intake`'s own Phase 1
(domain modules and an Add-ons decision on full-stack-app). That mined
draft becomes the first draft of `.hedgehog/chain/00-brief.md`, shown
back at Confirm & Lock for the user to accept or correct.

1. **Run `hedgehog-planning-intake`'s Phase 0 in full**: state the BMAD
   attribution it states, then run `bmad-brainstorming`,
   `bmad-product-brief`, `bmad-prfaq`, `bmad-prd`, `bmad-ux`,
   `bmad-deep-recon`, archived to `.hedgehog/BMAD/` with the fixed layout
   and `00-manifest.md` attribution header that skill's Phase 0 defines.
   `.hedgehog/BMAD/` is archival and immutable once written, same as
   `full-stack-app` — nothing in this core's day-to-day loop reads it
   live after this step mines it once.
2. **Mine a draft subject statement** from `.hedgehog/BMAD/`: the
   concrete subject (what is this actually selling/announcing/showing),
   the audience, and the page's single job, sourced from the brief and
   PR-FAQ (a landing page's brief and PR-FAQ are the closest BMAD
   artifacts to a subject statement — the PRD's Glossary and deep-recon
   output are read for supporting color, not required to resolve a
   one-page subject/audience/job). Where BMAD's material leaves any of
   the three genuinely unresolved, ask directly — don't proceed on
   vagueness, and don't invent an audience or job that wasn't stated,
   mined, or confirmed.
3. **Write `.hedgehog/chain/00-brief.md`** — the mined subject statement,
   one paragraph, plus the audience and single job named explicitly.
   This is the root every downstream phase's traceability audit walks
   back to; it draws from BMAD's archive but is its own file, in this
   core's own `.hedgehog/chain/` layout, not a pointer into
   `.hedgehog/BMAD/`.
4. **Confirm & Lock** — show the mined subject statement, audience, and
   job back in plain terms, alongside which BMAD skills ran and where
   their output lives (`.hedgehog/BMAD/`), before writing `TODO.md`.
   State plainly what happens on confirmation: *"This locks in the
   brief, commits it (`chore(planning): intake`), and hands off to
   `bootstrap` to scaffold the Astro workspace. The Strategist phase
   starts once that closes. Anything wrong or missing — say so now."*
   Wait for explicit go-ahead — a revision here is just another mining
   pass against the same BMAD archive, not a Correction Protocol entry,
   since nothing downstream exists yet.
5. **Write `TODO.md`** mirroring the phase table below, then commit
   planning intake's output as one commit, `chore(planning): intake` —
   `TODO.md`, `.hedgehog/BMAD/`, `.hedgehog/chain/00-brief.md`, and root
   `CLAUDE.md`'s filled placeholders.
6. **Hand off to `bootstrap`** once the commit lands.

`planner` owns this section; see that agent for when it runs.

## The Chain Method phases

Every phase's input is the prior phase's output, in this exact order — no
agent works from anything but what was actually handed to it. Steps 4a
(inside `landing-systems`) and 4c (inside `landing-strategist`) are the
only parallel-input point in the chain, both reading the same upstream
artifact; everything else is strictly sequential.

| # | Phase | Agent | Produces | Commit |
|---|---|---|---|---|
| 1 | Strategist | `landing-strategist` | Subject/audience/job statement (from planning intake — restated here as this phase's formal output) | `feat(landing): strategy` |
| 2 | Brand Anthropologist | `landing-strategist` | 3–5 adjective pairs (each with a named opposite) | bundled into `feat(landing): strategy` |
| 3 | Psychologist | `landing-strategist` | Adjectives sorted visceral / behavioral / reflective | bundled into `feat(landing): strategy` |
| 4 | Perfumer | `landing-strategist` | Top/heart/base note timing per adjective, the page's peak moment, the ending treatment | bundled into `feat(landing): strategy` |
| 5 | Ingredient Director + Copywriter | `landing-systems` | Dial table (color/type/form/space/motion) + voice spec, run against the same sorted-adjectives input | `feat(landing): systems` |
| 6 | Systems Designer | `landing-systems` | The token system (hex values, type roles, spacing unit, easing family, copy voice, with note timing attached) | bundled into `feat(landing): systems` |
| 7 | Signature Element | `landing-systems` | Signature element (source, persistence, continuity, scale range, literalness) | bundled into `feat(landing): systems` |
| 8 | Sequencer | `landing-sequencer` | Per-section transition type, weight, spacing, beat structure | `feat(landing): sequence` |
| 9 | Copywriter | `landing-copywriter` | Final page copy — headline (2 backups), every section's body text, CTA text, written to the voice spec and beat structure, reviewed and confirmed by the user | `feat(landing): copy` |
| 10 | Critic + Usability Auditor | `landing-critic` | Redlines, or a pass — reconciled traceability/distinctiveness + usability audit | `feat(landing): audit` (no commit if redlined — see Correction Protocol) |
| 11 | Builder | `landing-builder` | The built page, in Astro | `feat(landing): build` |

Phases 1 through 4 are one agent's context (`landing-strategist`)
because they're one continuous judgment call — subject into feeling into
timing — not separable artifacts with different tool footprints. Same
reasoning collapses 5–7 into `landing-systems` (everything that becomes
a Tailwind token or a copy rule) and 10's reconciliation into a single
`landing-critic` pass. Copy is its own phase, not folded into
`landing-systems` or `landing-builder`, specifically so the user reads
and confirms the actual words before either the audit or the build runs
— see `landing-copywriter`'s own file for its writing standard and
self-test.

## The Loop (every unit of work)

1. **Pick the next phase** per the table above, from `TODO.md`. One phase
   at a time, in order.
2. **Check the gate.** The prior phase is checkpointed and committed
   first.
3. **Delegate exactly one phase** to its owning agent, passing it the
   full chain so far (every upstream artifact, not just the immediately
   prior one) — an agent that only sees its direct input can't verify its
   own traceability back to the subject statement.
4. The agent **runs its self-test** (see that agent's own file for what
   it checks) before presenting its artifact.
5. The agent **commits** using the exact Conventional Commit format
   above.
6. **Check off the line in `TODO.md`** once the agent reports the commit
   landed.
7. **Repeat**, one delegated phase at a time.

Each commit batches exactly one phase's artifact; a wrong phase is fixed
forward later via the Correction Protocol.

## Correction Protocol

When a downstream phase reveals an upstream phase was wrong — most often
`landing-critic` redlining something that doesn't trace back to the
subject statement, or matches a known AI-default cluster:

1. Stop.
2. Patch the upstream phase directly, in place, via that phase's owning
   agent.
3. Fast-forward every dependent phase that breaks. A token system change
   (phase 6) ripples through the signature element (7), the sequence
   (8), the copy (9, if the voice spec shifted), and the build (11) —
   each gets its own small commit, in order, not one bundled fix.
4. Re-run `landing-critic` against the patched chain before resuming.
5. The commit messages are the explanation.
6. Resume the loop.

Use `conventional-commits` when a correction touches several phases in
one working-tree pass and needs splitting back into per-phase commits.

## Phase Transition Checks

Before `landing-strategist`'s step 2 (Brand Anthropologist) starts,
confirm step 1's subject/audience/job statement has been shown to and
confirmed by the user — not just drafted. This is the cheapest point in
the whole chain to correct the core framing (nothing downstream exists
yet); every phase after it inherits that framing silently, and by the
time `landing-copywriter` is reviewed at phase 9, a wrong framing means
unwinding four committed phases via the Correction Protocol instead of
one free revision here.

Before `landing-critic` starts, confirm `landing-copywriter`'s copy has
been presented to and confirmed by the user, not just written —
`landing-critic`'s traceability audit reads confirmed copy, not a draft
still awaiting review.

Before `landing-builder` starts, confirm:

- `landing-critic` returned a pass, not a redline — a redlined spec never
  reaches the Builder; it goes back to the phase the redline names.
- Every phase 1–10 has its commit landed.

Before `landing-strategist` starts, confirm planning intake's Confirm &
Lock has held and its commit has landed. If not, stop and ask.

## Rules

- **No agent introduces a choice that doesn't originate in the previous
  agent's output.** This is the chain's core discipline — enforced by
  `landing-critic`'s traceability audit, not by tooling, so treat a
  critic redline with the same weight a failed typecheck gets elsewhere
  in Hedgehog.
- **Ingredients move in agreement.** Color, type, space, motion, copy
  rhythm, and pacing are reconciled into one system at phase 6 — a
  mismatch (warm color, cold type) is a defect `landing-systems` owns
  fixing, not a later polish pass.
- **Sequential except phases 5's two parallel inputs.** The Ingredient
  Director and Copywriter sub-steps inside `landing-systems` read the
  same sorted-adjectives input and can run together; every other phase
  waits on the one before it.
- **A wrong phase gets fixed at its source** — the Correction Protocol,
  not a downstream workaround (e.g. don't patch the Builder's output to
  fix a token that's wrong at the Systems Designer level).
- **The Critic's veto is real.** `landing-critic` can send any phase back
  to its owning agent, citing which audit failed; it cannot rewrite the
  artifact itself.

## Core Reference Points

The chain's judgment calls, across every phase, are grounded in these —
not restated per-agent since they're shared foundation, not one phase's
procedure:

- Donald Norman, *Emotional Design* — visceral / behavioral / reflective
  (`landing-strategist`'s step 3)
- Scott McCloud, *Understanding Comics* — panel transition taxonomy,
  closure (`landing-sequencer`'s step 7)
- Will Eisner, *Comics and Sequential Art* — page as one composition
  before it's a sequence (`landing-sequencer`'s step 7)
- Rudolf Arnheim, *Art and Visual Perception* — visual weight, tension,
  balance (`landing-systems`'s step 4a/5 dial reconciliation)
- Josef Albers, *Interaction of Color* — color as relational, not
  absolute (`landing-systems`'s step 4a color dial)
- Dieter Rams / Massimo Vignelli — restraint as an emotional register
  (`landing-critic`'s Chanel cut, step 8)

## Stop Condition

A build session ends when every phase in `TODO.md` is checked off and
`landing-builder`'s artifact is committed, or when the subject statement
or an adjective is ambiguous enough that continuing means guessing — ask
one question and wait.
