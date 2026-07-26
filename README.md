# The Antidote to AI Spaghetti Code ⭐

[![Weekly downloads](https://img.shields.io/npm/dw/%40skyf0xx%2Fhedgehog?style=for-the-badge)](https://www.npmjs.com/package/@skyf0xx/hedgehog)

AI writes code fast. Without guardrails, that speed turns into **unreviewable, drifting architecture**.

Hedgehog is a **build discipline** for Claude Code: a **fixed stack, an enforced build order**, and a set of agents and skills that make **good engineering the default** instead of something you have to ask for.

Hedgehog runs BMAD for planning, then enforces the build that follows with tooling: Nx boundaries, commit hooks, and phase gates.

![Hedgehog - build software the right way, one step at a time](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/hero.png)

## What Hedgehog builds

1. **Full-stack TypeScript apps**: built module by module, backend first, on one fixed stack
2. **Landing pages**: a fixed pipeline from brief to a distinct, traceable page on modern frameworks

## How it stays reliable

- **Progressive layering**: each core builds one stable layer at a time: types → schema → backend → UI on `full-stack-app`; brief → feeling → tokens → sequence → artifact on `landing-page`
- **Small context loops**: work is decomposed into atomic, verifiable changes
- **Self-documenting architecture**: the codebase carries the context, not the AI's memory
- **Traceable evolution**: every decision is preserved through conventional commits

![Just describe what you want](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/handoff.jpg)

## Why Hedgehog Exists

AI coding starts fast, then breaks down. Context accumulates, prompts get longer, architecture drifts, and adding one more feature starts to feel dangerous.

### Plans expire. Structure doesn't

Without a mechanically enforced build order, an AI (or a person) has to hold the whole plan in its head (architecture, sequencing, past decisions) as an ever-growing prompt.

Hedgehog doesn't ask the AI to remember a plan. It makes the plan visible in the structure of the build, so the architecture itself guides the next step.

### The AI never has to guess what's next

Hedgehog turns the build into a sequence of small, deterministic steps instead of asking the AI to hold an entire application in context. The exact sequence depends on the project's core: a stateful app and a landing page don't share a build order, so they don't share an enforcement mechanism either.

For example, the `full-stack-app` core  builds each module progressively, schema → contract → repository → service → controller. Tests gate every step before the next one starts, and backend comes first, so every module gets a working, typed API before any screen is built. The frontend consumes stable capabilities instead of growing in parallel with backend complexity.

The build order isn't something you negotiate with the AI. It's encoded into the process, per core (see **The Hedgehog Loop**, below).

![Small steps, big leverage: small context loops, continuous verification, traceable evolution, sustainable velocity](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/small-steps.png)

## The Hedgehog Loop

Every core runs the same loop: plan, bootstrap, then build in a fixed,
mechanically-enforced order on an opinionated stack.

``` text
Planning intake - BMAD-METHOD's planning shelf, mined into this core's
scoping artifact
  ↓
Bootstrap
  ↓
Build in gated steps
  ↓
Repeat for the next step
```

![Why Hedgehog works: a different way to build with AI, comparing traditional AI workflow to Hedgehog](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/why.png)

Each core defines its own build order and stack.

## Installation

From an empty project folder ask Claude to install:

``` bash
# 1. Full-stack app (Nx, NestJS, Drizzle, ts-rest, Next.js)
npx @skyf0xx/hedgehog init --ts-full-stack-app

# 2. Landing page (Astro, Tailwind, GSAP)
npx @skyf0xx/hedgehog init --landing-page
```

Then open Claude Code and describe what you want to build.

To update:

``` bash
npx @skyf0xx/hedgehog update
```

This refreshes `.claude/agents/` and `.claude/skills/` only. It never
touches `CLAUDE.md`, `TODO.md`, the core workspace, or
`skills/BMAD`, since those carry project-specific or write-once content.

## For Builders

Once the project brief is defined, Hedgehog takes over execution: breaking the work into steps, following the build order, validating progress, and keeping every decision traceable.

Under the hood, it applies practices experienced engineers already rely on: iterative delivery, small units of work, clear architectural boundaries, ports and adapters, continuous verification, conventional commits. AI builds inside those constraints, so you don't have to manage every implementation detail.

## Architecture

Hedgehog is a package of agents and skills, built on an opinionated stack per core so the build order above is mechanical and enforced by the tooling itself. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## How Hedgehog Compares

Superpowers and BMAD both improve on raw prompting: one gives the AI good habits, the other a planning process. Alone, either can still be broken by convention.

Hedgehog runs BMAD for planning, then enforces the build that follows with tooling and tight boundaries.

| | Superpowers | BMAD | Hedgehog + BMAD |
| --- | --- | --- | --- |
| **What it is** | A skills library: brainstorm, plan, TDD, debug, review | A multi-agent planning framework: PM, Architect, Dev, QA personas | BMAD planning (brief → PRD → docs) →  feeding a fixed-stack, enforced-order build |
| **Order comes from** | Skill instructions the agent is told to follow | Sequenced documents (brief → PRD → architecture → stories) | Tooling (Nx, lefthook, phase gate) |
| **Enforcement mechanism** | None. Prompted convention | None. One optional checklist between phases | Execution mechanically enforced |
| **Unit of work** | A task, planned in worktree-isolated steps | A story, derived from PRD and architecture docs | A module layer (schema → contract → repo → service → controller → UI) |
| **Stack** | Whatever the project already uses | No stack opinion | One locked stack per core, chosen once at planning intake |
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
