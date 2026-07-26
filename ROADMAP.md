# Roadmap

Hedgehog ships two opinionated cores today — `full-stack-app` and
`landing-page` (see the Architecture section in `README.md`). The
roadmap is about where the discipline extends next — not about loosening
the opinions.

## Other agents besides Claude Code

Hedgehog's agents and skills are currently authored for Claude Code
(`.claude/agents/`, `.claude/skills/`). Supporting other coding agents means
the install step (`npx @skyf0xx/hedgehog init`) needs to scaffold each
agent's native format from the same source content, without forking the
discipline itself.

## Other cores

`full-stack-app` (Nx, NestJS, Drizzle, ts-rest, Next.js) and
`landing-page` (Astro, Tailwind, GSAP) are each locked because that's
what makes their build order mechanical — Nx module boundaries, phase
gates, and lefthook for one; the Chain Method's phase sequence and
`landing-critic`'s veto for the other.

Adding a third core doesn't start from language or framework
preference — it starts from intent, because intent is what determines which
progression needs enforcing at all. A video game and a CRUD web app don't
share a build order, so they can't share an enforcement mechanism. A
landing page and a full-stack app didn't either, which is why they're two
cores instead of one core with a mode flag. Language is a constraint
applied after intent narrows the field, not the first branch:

1. **What's being built** — the project shape decides the progression to
   enforce. A web app enforces schema → contract → repository → service →
   controller. A landing page enforces brief → feeling → tokens/motif →
   sequence → artifact. A game enforces a different spine (asset pipeline →
   scene → system → gameplay logic, say). A mobile-only app or a Python data
   service are their own shapes with their own natural sequence. This is the
   real fork — get it wrong and no amount of tooling in the next step will
   enforce the right order, because it's enforcing the wrong one.
2. **Language/runtime constraints, if any** — once the shape is fixed, does
   the user (or the target platform) constrain the language? Sometimes the
   shape implies it (a game engine implies its scripting language); sometimes
   the user does (an existing team's Python service).
3. **Tooling capable of mechanical enforcement within (1) and (2)** — module
   boundaries, phase gates, and pre-commit enforcement equivalent to Nx +
   lefthook (`full-stack-app`) or `landing-critic`'s traceability veto
   (`landing-page`) for that shape and language. This is the search, and
   it's the step most candidate cores fail: popular tooling in an ecosystem
   is rarely built to enforce a build order, only to allow one.

Until a candidate core clears step 3 — enforcing its build order as
mechanically as the two current ones do — it doesn't belong in Hedgehog. A
core Hedgehog can't enforce is just a suggestion, and suggestions are what
Hedgehog exists to replace.

## Core selection

`planner`'s Phase 0 currently decides between `full-stack-app`,
`landing-page`, and "neither" by judgment call, with no elicitation
behind it the way BMAD backs `full-stack-app`'s scope decisions. As more
cores land, this gate is the part most likely to need its own structured
procedure rather than a paragraph of heuristics in `planner.md` — worth
revisiting once a third core makes the judgment call genuinely three-way
ambiguous instead of a binary-plus-bailout.
