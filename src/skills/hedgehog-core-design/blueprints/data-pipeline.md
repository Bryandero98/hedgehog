# Data pipeline blueprint

A starting layer sequence for `hedgehog-core-design` Step 3 on the data
pipeline system shape. Adapt it for the project at hand — the adaptation
points below are expected, not exceptions — and record what changed in
`core-design.md`'s rationale.

```
schema    — the typed shape of every record crossing a stage boundary, and the validation that enforces it
extract   — pulling raw records from each source, with no reshaping beyond what the source forces
transform — the business logic: cleaning, joining, deriving, aggregating, all pure and source-agnostic
load      — writing results to the destination, plus whatever idempotency/upsert key the destination needs
schedule  — the orchestration wiring: what runs when, retries, backfill entry points
```

## Adaptation points

- Merge `schedule` into `load` when the pipeline is invoked externally
  (cron calling a script, an orchestrator defined outside this repo) —
  there's no orchestration surface here to build.
- Split `extract` per source (`extract/{module}`) when the pipeline pulls
  from several genuinely different systems with independent failure modes
  and auth; keep one `extract` layer for a single source.
- Merge `schema` into `extract` when there is one source and one
  destination and the record shape is small enough to declare in a single
  file — the types still exist and are still validated, they just don't
  need a layer of their own.

## Boundary that must hold

`transform` never reads from a source or writes to a destination — it
takes validated records in and returns records out. This is what lets the
business logic be tested on fixtures without network, credentials, or a
warehouse, and it's the boundary that decays first under deadline
pressure. A transform that "just needs one lookup" from the source is the
signal to widen `extract`'s output, not to reach across.
