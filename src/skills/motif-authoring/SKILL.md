---
name: motif-authoring
description: Use whenever `landing-systems` authors the signature motif (Chain Method step 6, `hedgehog-landing-loop`) or `landing-builder` implements one from `src/motifs/`. Trigger on "draw the motif", "author the motif", "write src/motifs/". Picks the right construction technique — p5.js, CSS, or Canvas 2D — per motif type, and gives the technique for producing each without hand-typed coordinate guessing.
---

# Motif Authoring

A motif is constructed from a formula or a measurement, never a
hand-typed coordinate. Freehand numeric coordinates — a bezier control
point, a magic pixel offset — are unreadable as numbers: there's no way
to tell what a shape looks like from its raw values while writing them,
so hand-typed geometry drifts into lumpy, asymmetric, or misaligned
results that read as generic rather than the sourced, deliberate motif
step 6 specifies.

## Pick the technique from the motif type

`landing-systems` step 6 names the motif's source, persistence,
continuity, scale range, and literalness. That spec determines which of
three techniques applies — pick one, don't mix by default:

1. **Organic / generative** (a material's grain, a growth pattern, a
   natural form that evolves) → **p5.js**. Write the motif as a rule —
   noise, jitter, growth, a formula-driven point set — not a curve typed
   out point by point. The generator is legible and adjustable; a
   hand-typed curve is neither.
2. **Static geometric** (a spine, a chevron, a blob, a simple silhouette
   that doesn't need to evolve) → **CSS** (`clip-path`, gradients,
   `border-radius`). Build the shape from `clip-path` polygon/shape
   functions, layered gradients, or `border-radius` percentage strings —
   values you can reason about exactly, animatable directly by GSAP
   (e.g. tweening a `border-radius` string in place of shape morphing).
3. **Measured / connective** (a thread, a line, a connector that must
   align to real element positions across the page) → **Canvas 2D with
   computed coordinates**. Measure the actual DOM positions
   (`getBoundingClientRect` or equivalent) at draw time and derive the
   path from those measured values — never an eyeballed or imagined
   coordinate.

## The rule within each technique

**Never hand-write multi-point geometry as raw guessed numbers**, in any
of the three:

- **p5.js** — construct from a formula (sine-based waveform, noise
  function, L-system, Voronoi cell, particle rule) with named parameters,
  not a manually plotted point list. Express motif variation
  (augmentation/inversion/retrograde, per `landing-systems` step 6's
  music-theory vocabulary) as parameter changes on the same generator,
  not a hand-edited copy.
  - Use **instance mode** (`new p5(sketch, container)`), not global mode
    — a global-mode sketch leaks `setup`/`draw`/every p5 function onto
    `window`, which collides with Astro's own module scope and with
    GSAP/ScrollTrigger's own render loop running on the same page.
  - Seed every source of randomness explicitly —
    `p.randomSeed(seed); p.noiseSeed(seed);` — with a fixed, committed
    seed value. This is what makes "derive from a formula" mean anything
    in practice: the same seed must always reproduce the exact same
    motif, so a reviewer (or `landing-critic`) can re-run it and get the
    committed result, not a fresh roll.
  - Collect the formula's inputs (particle count, noise scale, growth
    rate, angle — whatever the generator exposes) into one named
    `params` object at the top of the sketch, not scattered magic
    numbers through `draw()`. This is the same object the "state the
    parameters and what each one is for" verification step below reads
    from — an ungrouped generator is harder to audit, not just harder to
    read.
  - Mount inside a `client:*` island only where the sequencer's beat
    structure actually calls for the motif to animate; a motif that's
    static per section doesn't need a live p5 instance at all — render
    once and let CSS/GSAP handle any transform-level movement instead.
- **CSS** — build from `clip-path`'s named shape functions
  (`polygon()`, `circle()`, `ellipse()`, `inset()` with rounded corners)
  or `border-radius`'s percentage syntax, composed via layering and
  transforms (rotate, scale, translate) rather than freehand
  percentages guessed to "look right."
- **Canvas 2D** — derive every coordinate from a measurement (a DOM
  element's rect, a computed grid position, a formula applied to those
  measurements) — never a literal pixel value typed from eyeballing the
  page.

## Verifying a motif before committing it

A motif is not correct because it compiles. Before writing it into
`src/motifs/` and handing off:

- **Render it and look.** Use the Bash tool to run the dev server or a
  standalone preview and view the actual output — don't judge geometry
  or a Canvas draw call from the source alone.
- **State the construction's parameters and what each one is for** — a
  p5.js formula's inputs, a `clip-path` shape's control values, a Canvas
  draw's measured inputs — before accepting it. If you can't say why a
  value is what it is, it was guessed, not authored — redo it via the
  technique's proper primitives.
- **For p5.js, confirm the seed is fixed and committed**, not left to
  default/time-based randomness — re-running the sketch must reproduce
  the exact motif that was reviewed, not a new variation each load.
- **Check symmetry/proportion deliberately** where the source motif
  implies it (step 6's "literalness" and "scale range" fields).
- **Prefer fewer parameters.** A motif with 4 deliberate formula inputs
  or shape values reads as designed; one with 20 guessed numbers reads as
  noise, regardless of what it depicts.

## Constraints

- This skill governs *how* the motif is constructed, not *what* it is —
  the source, persistence, continuity, scale range, and literalness are
  `landing-systems` step 6's decisions (see `landing-systems.md`); this
  skill only prevents the geometry itself from being guessed.
- Don't reach for an icon library or stock asset as a shortcut around
  hard geometry — `landing-systems`'s existing constraint against generic
  decoration still applies. A hard-to-construct motif is a signal to
  simplify the formula or measurement, not to substitute a decorative
  asset.
- **Never hand-write an SVG `<path d="...">` with freehand bezier
  coordinates**, even as a fallback when none of the three techniques
  above feels like a clean fit. Bezier control points typed as raw
  numbers are unreadable — there's no way to tell what a curve looks
  like from its `d` string while writing it, so hand-typed paths drift
  into lumpy, asymmetric, or self-intersecting geometry regardless of
  how carefully they're written. If a motif genuinely doesn't fit p5.js,
  CSS, or Canvas 2D, that's a signal to reconsider the motif's source or
  literalness with `landing-systems` — not a reason to fall back to
  hand-authored SVG.
- `landing-builder` implements the motif exactly as authored here — a
  motif that's hard to render cleanly should be fixed at this step, not
  smoothed over during build.
