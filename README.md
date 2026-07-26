# The Antidote to AI Spaghetti Code ⭐

[![Weekly downloads](https://img.shields.io/npm/dw/%40skyf0xx%2Fhedgehog?style=for-the-badge)](https://www.npmjs.com/package/@skyf0xx/hedgehog)


AI writes code faster than humans ever could, but **speed without discipline creates chaos**.

**Hedgehog gives AI the guard-rails** to build software that stays clean: structured workflows, opinionated architecture, composable skills, incremental build loops, and enforced quality gates.

**Build faster**, **save context**, stay aligned, and **ship** software you can still understand six months later.

Hedgehog pairs **BMAD's planning** with **disciplined execution**, in one workflow.

- Build: Hedgehog execution discipline
- Plan: BMAD workflow
- Ship: Quality gates and incremental loops

![Hedgehog - build software the right way, one step at a time](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/hero.png)

## Hedgehog gives AI

1. An opinionated stack
2. An enforced build order
3. Agents and skills that make good engineering the default

Hedgehog ships more than one **core** — a fixed stack, agent set, and
build order for one project shape. `full-stack-app` is the original: Nx,
NestJS, Drizzle, ts-rest, Next.js, backend-first (see **The Hedgehog
Loop**, below). A second core, `landing-page`, applies the same
discipline to a different shape — Astro, GSAP, a fixed pipeline for
turning a brief into a traceable, non-templated page instead of a
domain-module build order (see **The Chain Method**, below). Which core
applies is decided once, at planning intake, from what you describe.

## Hedgehog's secret to great outcomes

- **Progressive layering:** each core builds one stable layer at a time — types → schema → backend → UI on `full-stack-app`; brief → feeling → tokens → sequence → artifact on `landing-page`
- **Small context loops:** decompose work into atomic, verifiable changes
- **Self-documenting architecture:** the codebase carries the context, not the AI
- **Traceable evolution:** decisions are preserved through conventional commits

![Just describe what you want](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/handoff.jpg)

## Why Hedgehog Exists

AI coding starts fast, then breaks down. Context accumulates, prompts get longer, architecture drifts. Eventually, adding one more feature feels dangerous.

Hedgehog's answer: guardrails, not more discipline from the AI.

## Plans Expire. Structure Doesn't

Without a build order enforced mechanically, an AI (or a person) has to carry the whole plan in its head: architecture, sequencing, past decisions, etc. as an ever-growing prompt.

Hedgehog doesn't ask the AI to remember a plan. It makes the plan visible in the structure of the build. The architecture itself guides the next step.

### The AI should never wonder what to do next

Instead of asking AI to hold an entire application in context, Hedgehog turns the build into a sequence of small, deterministic steps. The exact sequence depends on the project's core — a stateful app and a landing page don't share a build order, so they don't share an enforcement mechanism either. On the `full-stack-app` core:

Each module is built progressively: schema → contract → repository → service → controller. Every step is gated by tests and committed before the next begins.

Backend comes first. Every module gets a working, typed API before any screen is built. The frontend becomes a consumer of stable capabilities, not a parallel source of complexity.

The build order is not something you negotiate with the AI. It is encoded into the process — the same is true on the `landing-page` core, just for a different sequence (see **The Chain Method**, below).

![Small steps, big leverage: small context loops, continuous verification, traceable evolution, sustainable velocity](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/small-steps.png)

## The Hedgehog Loop (full-stack-app core)

``` text
Planning intake - BMAD-METHOD's brief/PRD/UX spec, mined into scope
boundary + domain vocabulary (planner agent)
  ↓
Bootstrap (once per project)
  ↓
Phase A, per module - schema → contract → repository → service → controller
  ↓
Phase A closes for the module (gated: typecheck, lint, test)
  ↓
Phase B, per module - hook → UX rationale → screen
  ↓
Repeat for the next module or the next step
```


![Why Hedgehog works: a different way to build with AI, comparing traditional AI workflow to Hedgehog](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/why.png)

## The Chain Method (landing-page core)

A different shape gets a different loop, not a variant of this one —
there's no domain module to build, so the enforced order is a pipeline
instead of a layer sequence:

``` text
Planning intake - BMAD-METHOD's brief/PR-FAQ/PRD/UX spec, mined into a
subject/audience/single-job statement (planner agent)
  ↓
Bootstrap (once per project - Astro + Tailwind workspace)
  ↓
Strategy - subject statement → adjective pairs → visceral/behavioral/
reflective sort → top/heart/base note timing (landing-strategist)
  ↓
Systems - ingredient dials + copy voice (parallel) → token system →
signature motif (landing-systems)
  ↓
Sequence - per-section transitions, weight, pacing (landing-sequencer)
  ↓
Audit - traceability/distinctiveness + usability, reconciled to a pass
(landing-critic) - redlines route back to the phase that owns them
  ↓
Build - the artifact, in Astro (landing-builder)
```

Every choice traces back to a sentence in the subject statement, or it
gets cut — that traceability is what keeps the output from converging on
the same templated look every AI-generated page defaults to.

## Installation

From an empty project folder:

``` bash
npx @skyf0xx/hedgehog init
```

This installs the `full-stack-app` core by default. For the landing-page
core instead:

``` bash
npx @skyf0xx/hedgehog init --core=landing-page
```

Then open Claude Code and describe what you want to build. The
`planner` agent decides which core actually applies (overriding the
installer's default if what you describe doesn't match it), then runs
that core's own planning intake — both cores run BMAD-METHOD's
brainstorming, brief, PR-FAQ, PRD, UX spec, and deep-recon in full;
`full-stack-app` mines that output into scope boundary and domain
vocabulary, `landing-page` mines it into a subject/audience/job
statement. Once you confirm, it scaffolds the project itself.

The chosen core's workspace - for `full-stack-app`: Nx, `packages/config`,
`packages/db`, `apps/api`, `apps/web`, and every enforcement file; for
`landing-page`: the Astro + Tailwind workspace and its animation library
set - lands instantly from a pre-verified template rather than being
generated live; bootstrap then verifies it (and, on `full-stack-app`,
runs whichever add-ons planning intake determined your project needs).

Or paste the repo URL to your Agent and have it install for you.

On a project that's already installed Hedgehog, pick up agent/skill
changes from a newer release with:

``` bash
npx @skyf0xx/hedgehog update
```

This refreshes `.claude/agents/` and `.claude/skills/` only — it never
touches `CLAUDE.md`, `TODO.md`, the core workspace, or
`skills/BMAD`, since those carry project-specific or write-once content.

## For Builders

Hedgehog brings proven software engineering practices into AI-assisted development.

Once the project brief is defined, Hedgehog takes over the execution: breaking the work into steps, following the build order, validating progress, and keeping decisions traceable.

Under the hood, it applies the practices experienced engineers rely on:

- iterative delivery
- small units of work
- an opinionated stack
- clear architectural boundaries
- ports and adapters
- continuous verification
- conventional commits

AI becomes the builder operating inside those constraints - turning ideas into software without requiring you to manage every implementation detail.

## Architecture

Hedgehog is a package of agents and skills, built on an opinionated stack per core so the build order above is mechanical and enforced by the tooling itself.

### `full-stack-app` core

| Layer | Choice | Why |
| --- | --- | --- |
| Monorepo | Nx | Enforces module boundaries at compile time. |
| Package manager | pnpm | Prevents accidental cross-package dependencies. |
| Backend | NestJS | Modules naturally mirror Hedgehog's build progression. |
| ORM | Drizzle + drizzle-zod | Database schema is the single source of truth. |
| Database | PostgreSQL | Simple, relational, predictable. |
| Local infra | Docker Compose | Postgres/Redis run identically on every machine. |
| Platform | Railway | Infrastructure is available from the first commit. |
| API contract | ts-rest | Contracts are code, not documentation. |
| Validation | Zod | One schema for runtime and compile time. |
| Auth | Better Auth | Secure by default from day one. |
| Data fetching | TanStack Query | UI consumes typed APIs, never implementation details. |
| Web | Next.js + ShadCN + Tailwind | UI remains a thin presentation layer. |
| Mobile | Expo + RN Reusables | Shares contracts and design tokens with web. |
| Jobs | BullMQ + Redis | Async boundaries exist before they're needed. |
| Logging | Pino | Structured logs from the first feature. |
| Linting | ESLint + Prettier | One shared standard across every module. |
| Testing | Vitest + Playwright | Every step is verifiable before progressing. |
| Commits | Conventional Commits | Architectural decisions become permanent history. |
| Observability | Sentry | Failures map cleanly back to module boundaries. |

### `landing-page` core

Every choice below maps to a specific dial or phase in the Chain
Method — nothing here is a default reached for out of habit:

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Astro | Zero-JS-by-default shell; islands only where interaction is actually needed. |
| Styling | Tailwind (v4, CSS-first) | Config as token layer only — no component library pre-deciding how things look. |
| Animation | GSAP + ScrollTrigger | Owns per-section pacing and top/heart/base fade timing with real control. |
| Scroll feel | Lenis | The "weight and suspension" dial, instead of default browser scroll physics. |
| Copy reveal | SplitType | Line/word/char splitting — makes copy rhythm visible in motion, not just static text. |
| Motif | SVG-first + Paper.js | Hand-authored graphics; Paper.js for a motif that evolves (augmentation/inversion) across sections. |
| Motif transforms | GSAP MorphSVGPlugin | Ships free inside the `gsap` package — for a motif that physically transforms across sections. |
| Texture | Custom SVG noise/grain filter | Cheap materiality layer nothing else in the stack owns. |
| Design handoff | Figma MCP / Stitch MCP | Input only, at the Strategist/Builder boundaries — never allowed to set spacing/style defaults directly. |
| 3D (rare) | React Three Fiber | Only when the subject is genuinely spatial; skipped by default. |

## How Hedgehog Compares

Superpowers and BMAD both improve on raw prompting: one gives the AI good habits, the other a planning process. Alone, either can still be broken by convention.

Hedgehog runs BMAD for planning on both cores — the same full shelf either way, mined differently per core's own shape — then enforces the build that follows with tooling, not convention — Nx boundaries, commit hooks, and phase gates on `full-stack-app`; a redline-gated pipeline on `landing-page`.

| | Superpowers | BMAD | Hedgehog + BMAD |
| --- | --- | --- | --- |
| **What it is** | A skills library: brainstorm, plan, TDD, debug, review | A multi-agent planning framework: PM, Architect, Dev, QA personas | BMAD planning (brief → PRD → docs) →  feeding a fixed-stack, enforced-order build |
| **Order comes from** | Skill instructions the agent is told to follow | Sequenced documents (brief → PRD → architecture → stories) | Tooling (Nx, lefthook, phase gate) |
| **Enforcement mechanism** | None. Prompted convention | None. One optional checklist between phases | Execution mechanically enforced |
| **Unit of work** | A task, planned in worktree-isolated steps | A story, derived from PRD and architecture docs | A module layer (schema → contract → repo → service → controller → UI) |
| **Stack** | Whatever the project already uses | No stack opinion | One locked stack per core (Nx/NestJS/Drizzle/ts-rest/Next.js for `full-stack-app`; Astro/Tailwind/GSAP for `landing-page`), chosen once at planning intake |
| **Context per step** | As much as the task pulls in | A full brief, PRD, and architecture doc per story | One module layer at a time - BMAD's docs are mined once, up front |
| **Finding a bug** | Search wherever the task touched | Search wherever the story touched | Search one layer, in one module, in a fixed order |
| **Real cost** | No safety net if the model shortcuts its own process | Documentation overhead most solo projects don't need | Stack and order aren't negotiable |

## Credits

Planning intake runs on [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
(`bmad-code-org/BMAD-METHOD`) MIT-licensed.

The `nx-generate`, `nx-run-tasks`, `nx-workspace`, and
`link-workspace-packages` skills are adapted from
[nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config)
(`nrwl/nx-ai-agents-config`) MIT-licensed, pinned to commit `9609810`
(2026-07-23) and rewritten for Hedgehog's pnpm-only workspace convention.

## Support Hedgehog

If Hedgehog helps you build better AI software, consider giving it a ⭐ on GitHub.

[![GitHub stars](https://img.shields.io/github/stars/skyf0xx/hedgehog?style=social)](https://github.com/skyf0xx/hedgehog/stargazers)
