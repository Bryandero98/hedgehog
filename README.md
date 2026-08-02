# Turn AI from a code generator into a reliable software engineer ⭐

[![Total downloads](https://img.shields.io/npm/dt/%40skyf0xx%2Fhedgehog?style=for-the-badge)](https://www.npmjs.com/package/@skyf0xx/hedgehog)

AI can write code in seconds.

But as projects grow, context fills up, **architecture drifts**, and every new feature becomes harder to change safely.

Hedgehog gives AI a **disciplined way to build software**: TDD. Opinionated architecture. Small, verifiable steps.

Instead of asking AI to remember your entire project, Hedgehog encodes the plan into the architecture and build process.

The codebase carries the context, not the model.

## Cleaner code, fewer tokens, faster builds ⭐⭐⭐⭐

![Hedgehog - build software the right way, one step at a time](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/hero.png)

## How it works

Hedgehog combines:

- **BMAD for planning** — turn an idea into a clear brief, requirements, and architecture
- **An opinionated stack** — remove unnecessary technical decisions, and settle the necessary ones once
- **TDD and progressive layering** — build one tested layer at a time
- **Mechanical enforcement** — use tooling and phase gates instead of trusting the AI to follow instructions
- **Small context loops** — keep every change focused, verifiable, and easy to review

Software that stays structured as it grows.

![Just describe what you want](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/handoff.jpg)

## The Hedgehog Loop

``` text
Plan
  ↓
Bootstrap
  ↓
Build one small, tested layer
  ↓
Verify
  ↓
Repeat
```

The build order is encoded into the project. The AI does not have to remember what comes next. It does not negotiate the architecture. It follows a proven path through the codebase.

![Small steps, big leverage: small context loops, continuous verification, traceable evolution, sustainable velocity](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/small-steps.png)

## What Hedgehog builds

### Full-stack applications

A fixed TypeScript stack with a backend-first, test-driven build order:

``` text
Schema
  ↓
Contract
  ↓
Repository
  ↓
Service
  ↓
Controller
  ↓
UI
```

Every layer is verified before the next begins.

### Landing pages

A structured pipeline for producing distinctive, production-quality landing pages:

``` text
Brief
  ↓
Feeling
  ↓
Design tokens
  ↓
Sequence
  ↓
Artifact
```

### Anything else

A CLI, a library, a browser extension, a data pipeline, a compiler — a
project fitting neither shape gets its own build order, designed from
your planning documents at intake rather than chosen from a menu. Run
`init` with no core flag: planning intake names the system shape, picks
the stack, derives the layers, and locks them to `.hedgehog/core.yaml`,
then generates that workspace and builds it one verified layer at a time.

The layers are bespoke, the enforcement is the same — ordered steps,
scoped file access, a verification command per layer, one commit each.

![Why Hedgehog works: a different way to build with AI, comparing traditional AI workflow to Hedgehog](https://raw.githubusercontent.com/skyf0xx/hedgehog/master/docs/images/why.png)

## Install

From an empty project folder, ask Claude to run:

``` bash
# Full-stack app
npx @skyf0xx/hedgehog init --ts-full-stack-app

# Landing page
npx @skyf0xx/hedgehog init --landing-page

# Anything else (CLI, library, browser extension, data pipeline, etc.)
npx @skyf0xx/hedgehog init
```

Then open Claude Code and describe what you want to build.

Plain `init` (no core flag) installs the agents, skills, and build graph
only — no workspace, no framework, nothing core-specific. Planning
intake designs an opinionated build order and stack for what you
actually describe, then bootstrap lands that workspace for the first
time. Don't pick `--ts-full-stack-app` or `--landing-page` by elimination
when neither actually fits.

To update:

``` bash
npx @skyf0xx/hedgehog update
```

This refreshes `.claude/agents/` and `.claude/skills/` only. It never
touches `CLAUDE.md`, the build graph, the core workspace, or
`skills/BMAD`, since those carry project-specific or write-once content.

## Why Hedgehog

Most AI coding tools improve prompting.

Hedgehog improves the **system AI builds inside**.

| | Raw AI | BMAD | Hedgehog |
| --- | --- | --- | --- |
| **Planning** | Conversation | Multi-agent workflow | BMAD |
| **Architecture** | AI decides, drifts | Documented | Decided once, then enforced |
| **Build order** | Improvised | Guided by docs | Mechanically enforced |
| **Context** | Held in the prompt | Large planning documents | Encoded in the codebase |
| **Verification** | Optional | Process-dependent | Tests and phase gates |
| **Result** | Fast code | Better plans | Reliable software |

## Architecture

Hedgehog uses a fixed stack and build order for each core. The tooling enforces architectural boundaries so correctness does not depend on the AI remembering instructions.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design.

## Credits

Hedgehog uses [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
(`bmad-code-org/BMAD-METHOD`) for planning, MIT-licensed.

The `nx-generate`, `nx-run-tasks`, `nx-workspace`, and
`link-workspace-packages` skills are adapted from
[nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config)
(`nrwl/nx-ai-agents-config`) MIT-licensed, pinned to commit `9609810`
(2026-07-23) and rewritten for Hedgehog's pnpm-only workspace convention.

`front-end-eng`'s animation skills (`skills/GSAP/`) are vendored from
[gsap-skills](https://github.com/greensock/gsap-skills)
(`greensock/gsap-skills`) MIT-licensed, pinned to commit `aed9cfd`
(2026-07-27).

## Support Hedgehog

If Hedgehog helps you build better software with AI, give it a ⭐ on GitHub.

[![GitHub stars](https://img.shields.io/github/stars/skyf0xx/hedgehog?style=social)](https://github.com/skyf0xx/hedgehog/stargazers)
