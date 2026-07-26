## This project's core: landing-page

The Chain Method: brief → feeling → tokens/motif → sequence → artifact,
where every visual choice traces back to a sentence that caused it. No
domain data, no backend — a single (or few-page) marketing site, built
once through a fixed pipeline rather than iterated on freely. See
`.hedgehog/BMAD/` for the vendored BMAD-METHOD shelf's raw output and
`.hedgehog/chain/` for this core's own archival planning intake output —
the Strategist's subject statement, the adjective/note tables, and the
token system, written once by `planner` and the pipeline agents, never
edited after a phase closes.

### The skills — invoke these, don't improvise

- **`hedgehog-landing-loop`** — every unit of work once bootstrapped:
  pick the next step from `TODO.md`, run exactly one Chain Method phase
  through its owning agent, gate it, commit it, check it off. Also holds
  the Correction Protocol for fixing a wrong upstream phase (e.g. a
  motif that doesn't trace back to the subject statement). Invoke it at
  the start of any build session and for "what's next".
- **`hedgehog-bootstrap-landing-page-core`** — run **once**, at project
  start, to land the pre-verified Astro + Tailwind workspace. Skip if
  `astro.config.mjs` already exists.
- **`conventional-commits`** — when a change spans several phases in one
  working-tree pass and needs splitting back into per-phase commits
  (mainly Correction Protocol cleanups).

### The agents — delegate the judgment calls

- **`planner`** — planning intake (which core applies, then this core's
  own brief intake: the vendored BMAD-METHOD shelf, run in full and
  mined into subject, audience, single page job) at project start.
  Writes `TODO.md`, `.hedgehog/BMAD/`, and `.hedgehog/chain/00-brief.md`.
  On first run, hands off to the `bootstrap` agent once Confirm & Lock
  holds.
- **`bootstrap`** — runs `hedgehog-bootstrap-landing-page-core`'s steps.
  Triggered automatically by `planner` after its first run; skip if
  `astro.config.mjs` already exists.
- **`landing-strategist`** — Chain Method steps 1–3 and 4c, plus the
  Diagnostician/Narrative Agent/Objection Agent sub-steps folded into
  step 1: subject statement → Awareness/Sophistication/Big-Idea
  diagnosis → narrative arc → objection map → adjective pairs
  (visceral/behavioral/reflective) → top/heart/base note timing and the
  page's single peak moment. One context, one artifact: the emotional
  and persuasive target spec.
- **`landing-systems`** — steps 4a/4b/5/6, run together: the ingredient
  dial table, the copy voice spec (plus the Awareness-gated headline and
  objection rebuttal prose), the token system that reconciles them, and
  the signature motif. Owns everything that becomes a Tailwind token or a
  piece of copy.
- **`landing-sequencer`** — step 7: per-section transition type, weight,
  spacing, and beat structure — the GSAP/ScrollTrigger/Lenis pacing spec
  the Builder implements against.
- **`landing-critic`** — steps 8–9 reconciled: traceability/distinctiveness
  audit (does every choice trace to the subject statement, does anything
  match a known AI-default cluster) and the usability pass (Fitts's Law
  on the CTA, affordance/signifier check). Has veto power; cannot rewrite,
  only redline back to the owning agent.
- **`landing-builder`** — step 10: builds the audited spec exactly in
  Astro. Anything that can't be built as specified is flagged back up the
  chain, never silently improvised around.

## The constants (do not deviate)

### Stack (locked, every project — no add-ons on this core)

**Astro** (zero-JS-by-default shell, islands only where interaction is
genuinely needed) · **Tailwind** (config as token layer only — no
component library on top) · **GSAP + ScrollTrigger** (primary animation
engine; owns Sequencer pacing and top/heart/base fade timing) ·
**Lenis** (smooth-scroll feel) · **SVG-first** (hand-authored graphics
for the motif — no icon library or generator look) · **SplitType**
(line/word/char copy-reveal splitting) · **Paper.js** (canvas vector
work for a motif that evolves across sections) · **MorphSVGPlugin**
(GSAP — for a motif that physically transforms across sections) ·
**custom SVG noise/grain filter** (cheap materiality/texture layer) ·
**React Three Fiber** (rare — only when the subject is genuinely
spatial; default is to skip it).

Figma MCP / Stitch MCP are handoff/input tools only, used at the
Strategist/Builder boundaries — never allowed to set spacing or style
defaults directly. Anything they hand off is re-derived through the
Systems Designer's token system (step 5) before it touches Tailwind
config.

Don't substitute libraries. If a package name changed upstream, verify
against current docs before running — don't swap in a different one, and
don't reach for a component library or icon set to fill a gap one of the
above doesn't cover; that gap is a signal to go back to the Ingredient
Vocabulary and derive the right choice, not to default to something
off-the-shelf.

### Layout

```
astro.config.mjs     Astro workspace root
tailwind.config.ts    token layer only — hex values, type roles, spacing unit, easing family from Step 5
src/
  pages/              one file per page (usually just index.astro)
  sections/           one component per page section, in Sequencer order
  motifs/             the signature SVG/Paper.js motif + its variation rules
  styles/             global.css — Tailwind import + CSS variable theme
.hedgehog/
  BMAD/               vendored BMAD-METHOD shelf's raw output (brief, PR-FAQ, PRD, UX spec, research) —
                       write-once, from planner
  chain/              this core's own archival planning intake output — subject statement, adjective tables,
                       token system, motif spec, sequence spec — write-once, from planner + pipeline agents
docs/
  design/              audited spec (Critic + Usability Auditor reconciled) the Builder builds from
```

### Core rules

- **One page, one job.** The Strategist's subject statement names it;
  every downstream choice traces back to that sentence or gets cut.
- **No agent introduces a choice that doesn't originate in the previous
  agent's output.** A motif the Motif Artist didn't source from the
  subject, a color the Ingredient Director didn't derive from an
  adjective — both get redlined by the Critic, not waved through.
- **Ingredients move in agreement.** Color, type, space, motion, copy
  rhythm, and pacing are one system reconciled at step 5 — a page warm
  in color but cold in type is a defect, not a style choice.
- **Sequential through the pipeline.** A phase starts only once the
  phase before it is checkpointed and committed — steps 4a/4b/4c run in
  parallel (same input), everything else is strictly sequential.
- **One phase = one commit**, in the exact Conventional Commit format
  from `hedgehog-landing-loop`.
- **Fix wrong phases at the source** via the Correction Protocol — never
  a downstream workaround (e.g. don't patch the Builder's output to fix
  a token that's wrong at the Systems Designer's level).
- **The Critic's veto is real.** A traceability or default-cluster
  failure blocks the Builder from starting, the same way a failing gate
  blocks a commit elsewhere in Hedgehog.
