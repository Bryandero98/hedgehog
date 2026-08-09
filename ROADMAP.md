# Roadmap

Where Hedgehog is headed, open for contribution. Read
[CONTRIBUTING.md](CONTRIBUTING.md) first — it defines the rules this repo's
content has to follow (current-state-only files, one owning file per rule,
scoped PRs).

Two tiers below. **Bigger items** are multi-session, some architectural.
**Small items** are each scoped to one file or one narrow addition — a
single sitting, no design discussion required to start. If you've never
contributed to Hedgehog before, start there.

## Bigger items

### A mobile Golden Core

The two existing Golden Cores (`full-stack-app`, `landing-page`) are
hand-built, pre-verified workspaces reserved for shapes common and
opinionated enough to deserve that treatment. Mobile (React Native or
similar) is the strongest candidate for a third: navigation, offline state,
and native build tooling carry enough real architectural decisions that a
`hedgehog-core-design` blueprint alone won't lock them the way a Golden Core
does. Scope: a pre-built, pre-verified workspace under `src/golden-cores/`,
a `--mobile` install flag, and the phase/layer build order that goes with
it — modeled on `src/golden-cores/full-stack-app/`.

### Onboarding onto an existing codebase

`init` assumes a greenfield-ish start. Retrofitting Hedgehog's discipline
onto a live codebase with existing architecture, existing tests (or none),
and existing drift is a different problem: bootstrap has nothing to
generate, and the build graph has no clean layer boundaries to inherit.
Scope: an intake path that reads an existing repo's structure, proposes
module boundaries and phase gates that fit what's already there, and lands
`.hedgehog/` state without touching working code. Worth scoping as its own
design discussion before a PR — this is closer in size to a new bootstrap
skill than a single change.

### Add-ons beyond Auth, Queue, and Mobile

`full-stack-app`'s Add-ons step (`hedgehog-bootstrap`) currently offers
three. Payments, transactional email, file storage/uploads, and background
jobs are common enough asks that they'd each justify their own add-on
following the same one-commit-per-step pattern the existing three use. Each
add-on is roughly its own small item once the pattern is followed — see
`src/skills/hedgehog-bootstrap/SKILL.md` for the shape an add-on step takes.

## Small items (single session, good first contribution)

### New core-design blueprints

`src/skills/hedgehog-core-design/blueprints/` covers nine shapes (CLI,
library/SDK, browser extension, desktop app, game, data pipeline,
bot/agent, compiler/language tool, infra/deploy tool) — each one a single
25–60 line markdown file read at planning intake for a system shape that
isn't a Golden Core. Shapes not yet covered: an MCP server, a Slack/Discord
bot, a monorepo-of-services, a static site generator plugin. Adding one is
scoped to one new file plus a routing entry — model it on the shortest
existing blueprint (`cli.md`) rather than the longest.

### New host support

`src/hosts/` has one directory per coding agent Hedgehog installs into
(`claude/`, `cursor/`, `gemini/`) — each is a `DISPATCH.md` (15–30 lines)
plus that agent's native config format, wired into `capabilities.mjs` and
`routing.mjs`. Windsurf, Copilot CLI/Workspace, and OpenCode are plausible
next hosts. Each is scoped to one new `src/hosts/<name>/` directory and the
corresponding entries in the two `.mjs` files — see `src/hosts/gemini/` for
the smallest existing example to model against.

### Small doc and DX gaps

Anything found while actually using Hedgehog that's a one-file fix: a
missing flag in a `--help` output, a stale cross-reference between an
agent/skill file and `README.md`, an error message that doesn't say what to
do next. File an issue with the concrete repro, or send the fix directly if
it's a single file.

## Contributing to this list

Adding an item here is itself a contribution. Keep new entries scoped the
same way the ones above are: a stated problem, where it lives in the repo,
and what "done" looks like — not a vague direction.
