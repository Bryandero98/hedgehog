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
- **`landing-strategist`** — subject statement → adjective pairs →
  visceral/behavioral/reflective sort → top/heart/base note timing and
  the page's single peak moment. One context, one artifact: the
  emotional target spec.
- **`landing-systems`** — the ingredient dial table, the copy voice spec,
  the token system that reconciles them, and the signature motif. Owns
  everything that becomes a Tailwind token or a copy rule.
- **`landing-sequencer`** — per-section transition type, weight, spacing,
  and beat structure — the GSAP/ScrollTrigger/Lenis pacing spec the
  Builder implements against.
- **`landing-copywriter`** — the final page copy: headline (2 backups),
  every section's body text, CTA text — written to the voice spec and
  the sequence's beat structure. Presented as its own artifact for the
  user to read and confirm before the audit or the build runs.
- **`landing-critic`** — the reconciled traceability/distinctiveness
  audit (does every choice, including the copy, trace to the subject
  statement, does anything match a known AI-default cluster) and the
  usability pass (Fitts's Law on the CTA, affordance/signifier check).
  Has veto power; cannot rewrite, only redline back to the owning agent.
- **`landing-builder`** — builds the audited spec exactly in Astro,
  placing `landing-copywriter`'s copy verbatim. Anything that can't be
  built as specified is flagged back up the chain, never silently
  improvised around.

## The constants (do not deviate)

### Stack (locked, every project — no add-ons on this core)

**Astro** (zero-JS-by-default shell, islands only where interaction is
genuinely needed) · **Tailwind v4, CSS-first** (config as token layer
only — no component library on top) · **GSAP + ScrollTrigger**, scoped to
CSS/transform targets only, no plugins (primary animation engine; owns
Sequencer pacing and top/heart/base fade timing) · **Lenis** (smooth-
scroll feel, the "weight and suspension" dial) · **SplitType**
(line/word/char copy-reveal splitting) · **p5.js** (organic/generative
motifs — described as a rule: noise, jitter, growth — not hand-typed path
data) · **CSS `clip-path` / gradients / `border-radius`** (static
geometric motifs — spines, chevrons, blobs — GSAP-animatable directly,
zero coordinate-guessing risk) · **Canvas 2D with computed coordinates**
(measured/connective motifs — threads/lines that align to real DOM
positions, drawn from measured values) · **`ogl`** (lightweight WebGL) or
a raw shader (a continuous background field spanning the full page
height, so sections read as windows onto one surface) · **CSS
`clip-path` irregular edges + `mix-blend-mode` overlap + negative-margin
overlap** (section boundary treatment — breaks the hard horizontal seam
between sections without a new dependency) · **CSS `mask-image` + noise
pattern** (texture/grain layer) · **React Three Fiber** (rare — only when
the subject is genuinely spatial; default is to skip it).

This core has no design-handoff tool. All visual decisions are derived
directly through the Systems Designer's token system (step 5) and the
motif techniques above — never imported from an external design file.

Don't substitute libraries. If a package name changed upstream, verify
against current docs before running — don't swap in a different one, and
don't reach for a component library or icon set to fill a gap one of the
above doesn't cover; that gap is a signal to go back to the Ingredient
Vocabulary and derive the right choice, not to default to something
off-the-shelf.

Motifs are always constructed from a formula or a measurement, never
hand-typed coordinates: an organic motif is a p5.js rule (noise, jitter,
growth), a static geometric motif is CSS (`clip-path`, gradients,
`border-radius`), and a measured/connective motif is Canvas 2D drawn from
real DOM positions. See the `motif-authoring` skill for the technique
per motif type.

### Layout

```
astro.config.mjs     Astro workspace root
src/
  pages/              one file per page (usually just index.astro)
  sections/           one component per page section, in Sequencer order
  motifs/             the signature motif (p5.js / CSS / Canvas 2D) + its variation rules
  styles/             global.css — Tailwind v4 CSS-first import + the `@theme` token layer (hex values, type roles, spacing unit, easing family from Step 5)
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
