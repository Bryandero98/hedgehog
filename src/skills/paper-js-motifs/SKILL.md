---
name: paper-js-motifs
description: Use whenever `landing-builder` implements a motif that `motif-authoring` has routed to Paper.js (organic/generative source — noise, jitter, growth, a formula-driven point set). Trigger on "implement the motif in Paper.js", "write the PaperScope sketch", "src/motifs/*.ts" for an organic motif. Gives the concrete API patterns — scoping, seeded randomness, the params object, setter-based redraw — that keep a Paper.js sketch a formula instead of hand-plotted geometry.
---

# Paper.js Motifs

`motif-authoring` decides *that* a motif is organic/generative and
therefore Paper.js; this skill covers *how* to write the Paper.js sketch
itself once that decision is made. Every pattern below exists to keep
the sketch a legible, re-runnable formula — not a one-off script that
happens to draw the right thing once.

## Scope the sketch to its own `PaperScope`

Never call the global `paper.setup(canvas)` API. A landing page runs an
Astro island's own module scope, Motion's render loop, and potentially
more than one motif on the same page — the global `paper` object is
shared mutable state across all of them, and one sketch's `paper.project`
silently becomes another's.

```ts
import paper from 'paper';

const scope = new paper.PaperScope();
scope.setup(canvasEl);

scope.activate();
// construct the scene graph here — every paper.* call inside this
// block resolves against `scope`, not the global instance
scope.view.draw();
```

Every exported function this skill's patterns produce (draw, and any
setter) must call `scope.activate()` before touching `paper.*`,
including on repeat calls — a setter invoked after some other scope
activated in between will otherwise mutate the wrong project.

## Seed every source of randomness

Paper.js has no built-in seeded noise or random. Bring a small,
dependency-free PRNG (a mulberry32 or sfc32-style function is enough —
a few lines, no package) and seed it with a fixed literal committed in
the sketch:

```ts
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x5eed); // fixed seed — never Date.now() or Math.random()
```

Use `rand()` for every stochastic input the formula needs (jitter
amount, particle position, growth angle). This is what makes "derive
from a formula" a real guarantee rather than a one-time roll: re-running
the sketch, in dev or in `landing-critic`'s review, must reproduce the
exact motif that was committed — never a fresh variation per load.

## Collect inputs into one `params` object

```ts
const params = {
  pointCount: 48,
  noiseScale: 0.08,
  growthRate: 1.4,
  baseAngle: Math.PI / 6,
  seed: 0x5eed,
};
```

Every magic number the construction function reads comes from this
object, not a literal scattered through the formula. This object is
also the answer to "state the construction's parameters and what each
one is for" — `motif-authoring`'s verification step reads directly from
it, so an ungrouped generator is a review blocker, not just a style
complaint.

## Build the scene graph from the formula, once

Construct `Path`/`Group` objects by iterating the formula's output —
never by typing coordinates by hand:

```ts
scope.activate();

const path = new scope.Path({
  strokeColor: 'var(--color-accent)',
  strokeWidth: 2,
});

for (let i = 0; i < params.pointCount; i++) {
  const t = i / params.pointCount;
  const angle = params.baseAngle * i + rand() * params.noiseScale;
  const radius = 40 + params.growthRate * i;
  path.add(
    new scope.Point(Math.cos(angle) * radius, Math.sin(angle) * radius),
  );
}
path.smooth();

scope.view.draw();
```

Don't add a `view.onFrame` handler unless `landing-sequencer`'s beat
structure specifies continuous motion for this motif. A motif that's
static per section needs exactly this: build once, `view.draw()` once.

## Setters mutate scene graph state directly — never replay the script

Motif variation (augmentation/inversion/retrograde, per
`landing-systems` step 6's vocabulary) is a property assignment on the
already-built objects, followed by a redraw — not a second call into the
construction function:

```ts
export function setGrowth(factor: number) {
  scope.activate();
  path.segments.forEach((seg, i) => {
    seg.point = seg.point.multiply(factor);
  });
  scope.view.draw();
}
```

There's no transform/style stack to reset before a setter runs, because
nothing replays — the scene graph holds current state directly, and the
setter changes that state in place. If a redraw needs a genuinely
different point set (not a transform of the existing one), recompute
from `params` and reassign `path.segments = newSegments`, still followed
by `scope.view.draw()`, still without reconstructing `path` itself.

## Common mistakes this skill exists to prevent

- **Calling `paper.setup()` on the global scope** instead of a scoped
  `PaperScope` instance — breaks the moment a second motif or another
  Paper.js consumer runs on the same page.
- **Using `Math.random()` or a time-based seed** — makes the motif
  non-reproducible; every reload or every review produces a different
  shape.
- **A draw loop (`view.onFrame`) on a motif the spec says is static** —
  wastes render budget and fights Motion's own scroll-driven timeline
  for the same frame budget.
- **Reconstructing the whole `Path` inside a setter** instead of mutating
  existing segments/properties — loses the "retained-mode scene graph"
  property that's the entire reason `motif-authoring` picked Paper.js
  over an imperative Canvas redraw.
- **A literal scattered through the loop body** instead of a named field
  on `params` — indistinguishable from a guessed number to a reviewer,
  even when it was in fact derived from something real.

## Constraints

- This skill covers Paper.js API usage only. Whether a given motif
  belongs in Paper.js at all — versus CSS or Canvas 2D — is
  `motif-authoring`'s decision (source, persistence, continuity, scale
  range, literalness from `landing-systems` step 6), not this skill's.
- `paper` is already a pinned dependency in the `landing-page` core
  (`src/golden-cores/landing-page/package.json`) — never add a
  competing geometry/animation library to work around something this
  skill's patterns don't cover.
