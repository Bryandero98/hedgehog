# Hedgehog (this repo)

Hedgehog is a build discipline for AI-guided software projects. This repo
holds the discipline itself as a package of Claude Code agents and
skills — the executable payload a consuming project copies in to work
Hedgehog-style, and is the source of the method. See `README.md` for the
discipline's stance and rationale.

## Layout

- `src/agents/` — the subagent roles a consuming project copies into its
  own `.claude/agents/`: `planner` (planning intake, module scoping),
  `bootstrap` (Bootstrap step sequencing), `backend-eng` (Phase A build
  steps), `ux-planner` (Phase B UX rationale), `front-end-eng` (Phase B
  build steps), `layer-eng` (authored-core layer build steps), `reviewer`
  (phase and layer transition checks, Correction Protocol review), plus
  the `landing-page` core's own chain agents
  (`landing-strategist`, `landing-systems`, `landing-sequencer`,
  `landing-copywriter`, `landing-critic`, `landing-builder`). `tweaker`
  (post-build tweak requests and friction-log-driven Hedgehog issue
  suggestions) is shared by every core.
- `src/skills/` — the packaged procedures a consuming project copies into
  its own `.claude/skills/`:
  - `hedgehog-bootstrap-full-stack-app-core` — lands the always-on core workspace (Nx,
    enforcement config, `packages/db`, `apps/api`, `apps/web`) from a
    pre-built, pre-verified template, one pass, before any add-on step.
  - `hedgehog-bootstrap` — scaffolds whichever add-ons (Auth, Queue,
    Mobile) planning intake turned on, one commit per step, after core
    has landed.
  - `hedgehog-planning-intake` — runs the vendored BMAD-METHOD planning
    shelf (`skills/BMAD/`), shared by every core, and mines its output
    into scope boundary, domain modules, and the Add-ons decision on
    `full-stack-app`. Invoked by `planner`; `landing-page` runs this
    skill's shelf too, then mines the same archive through
    `hedgehog-landing-loop`'s own planning-intake section instead.
  - `hedgehog-core-design` — designs a layer sequence and writes
    `.hedgehog/core.yaml` when neither Golden Core fits a project that is
    still building something real. Invoked by `planner` as Phase 0's
    third outcome, after the BMAD shelf has run; Hedgehog designs the
    architecture here rather than asking the user to.
  - `hedgehog-bootstrap-authored-core` — generates the workspace for the
    stack `hedgehog-core-design` chose, one pass, closing Bootstrap on an
    authored core.
  - `hedgehog-loop` — the operating loop for every unit of work on
    `full-stack-app` once bootstrap has run: the domain module step
    sequence, phase rules, and Correction Protocol.
  - `hedgehog-authored-loop` — the same role on an authored core: one
    layer per `hedgehog next` packet via `layer-eng`, the module-axis
    reading, Correction Protocol, and Stop Condition, all driven from
    `.hedgehog/core.yaml`.
  - `conventional-commits` — reconstructs step-shaped, conventional
    commit history when work didn't land cleanly as it went (mainly
    Correction Protocol cleanups).
  - `nx-generate`, `nx-run-tasks`, `nx-workspace`,
    `link-workspace-packages` — Nx tooling procedures (scaffolding,
    running tasks, read-only workspace exploration, wiring workspace
    package dependencies) used by `backend-eng` and `front-end-eng`.
    Adapted from `nrwl/nx-ai-agents-config` (MIT-licensed, see
    `README.md`'s Credits section) for Hedgehog's pnpm-only convention.
- `skills/BMAD/` — BMAD-METHOD (`bmad-code-org/BMAD-METHOD`,
  MIT-licensed), vendored in full: the planning shelf
  `hedgehog-planning-intake` runs. See `skills/BMAD/ATTRIBUTION.md` for
  the pinned source commit; re-vendoring is a deliberate act via the
  `bmad-revendor` skill, not automatic.
- `src/templates/` — files a consuming project copies (and then edits or
  deletes) rather than running as-is: `TODO.md`, the live build checklist
  template (including its `## Add-ons` block); and `CLAUDE.md`, the
  project-root guide the installer drops in (project-context placeholders
  the `planner` fills at planning intake, plus the Hedgehog constants —
  stack, layout, rules, skill/agent pointers, and context-management
  guidance). One `CLAUDE.core.<core>.md` section per core fills that
  shell's `{{CORE_SECTION}}` — at install time when `init` is given an
  explicit core flag, or by the matching bootstrap-core skill when `init`
  ran with no flag and the shell landed with that placeholder still
  unfilled. `{{HOST_DISPATCH}}` is filled at install time from the chosen
  host's `DISPATCH.md`.
- `src/hosts/` — one entry per coding agent Hedgehog installs into
  (Claude Code, Cursor, Gemini CLI): where the payload lands, which
  instructions file that agent loads, and how to emit the agent files
  when its format differs from the canonical one. `capabilities.mjs`
  owns the agent → tool-grant fact for hosts that can't register a
  per-agent grant; `routing.mjs` generates the root `AGENTS.md` index
  from the agents' and skills' own frontmatter. See
  [ARCHITECTURE.md](ARCHITECTURE.md) for the host table.

## Working in this repo

This repo's own content is the product. Changes here are edits to the
discipline itself: agent and skill content under `src/`, `README.md`,
and any shared config or generators the discipline references.

- Every file states current state only — no negation of alternatives, no
  changelog-style narration, no "we used to do X." If a file needs to
  change, edit it to say what's true now.
- Every rule an agent or skill depends on lives inside that agent or
  skill file, or in `README.md` — not in a separate reference document.
  A consuming project copies `agents/` and `skills/` verbatim, so nothing
  load-bearing may live outside them.
- A fact restated across multiple agents/skills (e.g. the commit-message
  format, the domain module shape) has exactly one owning file; others
  reference it by name rather than restating the substance.
