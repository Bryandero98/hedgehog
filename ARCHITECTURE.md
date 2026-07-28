# Architecture

Hedgehog is a package of agents and skills, built on an opinionated stack per core so the build order in the [README](README.md) is mechanical and enforced by the tooling itself.

## `full-stack-app` core

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

## `landing-page` core

Every choice below maps to a specific dial or phase in the Chain
Method: nothing here is a default reached for out of habit.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Astro | Zero-JS-by-default shell; islands only where interaction is actually needed. |
| Styling | Tailwind v4 (CSS-first) | Config as token layer only, no component library pre-deciding how things look. |
| Animation / pacing | Motion (CSS/transform targets only, no plugins) | Owns per-section pacing and top/heart/base fade timing via `animate()`/`scroll()`/`stagger()`. |
| Scroll feel | Lenis | The "weight and suspension" dial, instead of default browser scroll physics. |
| Copy reveal | SplitType | Line/word/char splitting, makes copy rhythm visible in motion, not just static text. |
| Organic/generative motif | Paper.js | Motif described as a rule (noise, jitter, growth) driving a retained-mode scene graph instead of hand-typed path data or an imperative redraw. |
| Static geometric motif | CSS `clip-path` / gradients / `border-radius` | Simple shapes (spines, chevrons, blobs) with zero coordinate-guessing risk; Motion-animatable directly. |
| Measured/connective motif | Canvas 2D with computed coordinates | Threads/lines that align to real DOM positions, drawn from measured values, not imagined ones. |
| Continuous background field | `ogl` (lightweight WebGL) or raw shader | One field spanning the full page height so sections read as windows onto one surface, not stacked blocks. |
| Section boundary treatment | CSS `clip-path` irregular edges + `mix-blend-mode` overlap + negative-margin overlap | Breaks the hard horizontal seam between sections without any new dependency. |
| Texture/grain | CSS `mask-image` + noise pattern | Materiality layer, no SVG filter needed. |
| 3D | React Three Fiber | Only when the subject is genuinely spatial; skipped by default. |
