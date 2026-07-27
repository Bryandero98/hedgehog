---
name: svg-motif-authoring
description: Use whenever `landing-systems` authors the signature motif (Chain Method step 6, `hedgehog-landing-loop`) — hand-authoring an SVG or Paper.js sketch from scratch. Trigger on "draw the motif", "author the SVG", "write src/motifs/". Technique for producing a clean, distinctive vector shape without freehand bezier-path guessing, which is where hand-drawn motifs go wrong.
---

# SVG Motif Authoring

Freehand `<path d="...">` coordinates written directly, number by number, are
the failure mode this skill exists to avoid. Bezier control points are
unreadable as numbers — there's no way to tell what a curve looks like from
its `d` string while writing it, so hand-typed paths drift into lumpy,
asymmetric, or self-intersecting geometry that reads as generic clip-art
rather than the sourced, deliberate motif `landing-systems` step 6 specifies.

## The rule

**Never hand-write a multi-point bezier path as raw numbers.** Build the
motif from primitives and operations you can reason about exactly, in this
order of preference:

1. **Primitive composition** — circles, rects, polygons, and single-arc paths
   (`M`/`L`/`A` only, no freehand `C`/`Q`), combined via position, rotation,
   and scale. Most sourced motifs (a material's cross-section, a tool's
   silhouette, a natural form reduced to its defining contour) decompose into
   2–4 primitives plus boolean ops, not one continuous freehand outline.
2. **Boolean ops on primitives** — union, subtract, intersect (as
   `<clipPath>`/`<mask>`, or Paper.js's `PathItem.unite/subtract/intersect`)
   to derive the actual silhouette. This is how the motif stays exact and
   reproducible instead of eyeballed.
3. **Parametric/generative construction** — when the source genuinely has an
   organic contour (a leaf vein, a wave, a woodgrain line), generate it: a
   Paper.js script driven by a formula (sine-based waveform, L-system,
   Voronoi cell, noise-perturbed circle) rather than a hand-typed curve.
   Write the *generator*, not the resulting points — the generator is
   legible and adjustable, a hand-typed curve is neither.
4. **Single freehand bezier segment, only as last resort** — if a genuinely
   organic, non-formulaic curve is unavoidable (rare — most "organic" shapes
   in step 6's Ingredient Vocabulary are formula-expressible per #3), keep it
   to one continuous stroke, symmetric where the source is symmetric, and
   verify per the check below before accepting it.

## Verifying a path before committing it

A path is not correct because it compiles. Before writing it into
`src/motifs/` and handing off:

- **Render it and look.** Use the Bash tool to write a standalone HTML file
  wrapping the SVG (or the Paper.js canvas output) and open it, or inline it
  in the dev server's page temporarily — don't judge geometry from the
  markup alone.
- **State the path's point count and what each segment is for**, in a
  one-line comment or in your own reasoning, before accepting it. If you
  can't say why a control point is where it is, it was guessed, not
  authored — redo it via primitives instead.
- **Check symmetry/proportion deliberately** where the source motif implies
  it (step 6's "literalness" and "scale range" fields) — a hand-guessed
  curve almost always drifts asymmetric even when the source is symmetric.
- **Prefer fewer anchor points.** A motif with 4 deliberate anchor points
  reads as designed; one with 20 freehand points reads as a mouse-drawn
  scribble, regardless of what it depicts.

## Paper.js specifics

For motifs that must evolve across sections (`landing-systems` step 6's
persistence/continuity fields):

- Construct the base shape from `Path.Circle`, `Path.Rectangle`,
  `Path.RegularPolygon`, or a formula-driven `Path` built point-by-point in a
  loop (e.g. `for (let t = 0; t <= 1; t += step)` sampling a parametric
  function) — never `Path()` with hand-typed segment coordinates.
- Express augmentation/inversion/retrograde (the motif-variation vocabulary
  step 6 borrows from music theory) as transforms (`scale`, `rotate`,
  `reflect`) or formula-parameter changes on the same generator, not as a
  hand-edited copy of the base path.

## Constraints

- This skill governs *how* the motif is drawn, not *what* it is — the
  source, persistence, continuity, scale range, and literalness are
  `landing-systems` step 6's decisions (see `landing-systems.md`); this
  skill only prevents the geometry itself from being guessed.
- Don't reach for an icon library or stock SVG asset as a shortcut around
  hard geometry — `landing-systems`'s existing constraint against generic
  decoration still applies. A hard-to-draw motif is a signal to simplify via
  more primitives, not to substitute a decorative asset.
- `landing-builder` implements the motif exactly as authored here — a motif
  that's hard to render cleanly should be fixed at this step, not smoothed
  over during build.
