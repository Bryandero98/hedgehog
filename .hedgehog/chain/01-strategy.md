# Strategy

## Step 1 — Subject/audience/job statement

Hedgehog is a set of Claude Code agents and skills you copy into your
project that force AI-generated code to follow a fixed build order and
get checked at every step, so the codebase stays correct because the
process enforces it — not because the AI "remembers" it. It's for
developers and technical founders already building with AI coding tools
(Claude Code, Cursor, etc.) who've watched AI-written code work at first
and then rot as the project grows, because nothing was actually checking
it. The page's one job: get that developer to run
`npx @skyf0xx/hedgehog init` by making them recognize that rot as
something that's happened to them, and see Hedgehog's small-step,
mechanically-checked process as what stops it.

Plain-verb check: "You copy in a set of files that make the AI build in
small checked steps instead of one long unsupervised stretch, so
mistakes get caught before they pile up." Same verb family as the formal
statement (copy in / build in checked steps / catch) — no abstraction
noun standing in for the action. Passed.

Swap test: substituting a competitor's name in doesn't hold — the
specific claims (copy-in agents/skills, fixed build order, per-step
verification, "AI works then drifts" as the named failure) aren't
generic productivity-tool language. Passed.

## Step 2 — Adjective pairs (Brand Anthropologist)

Cut before finalizing: "innovative," "powerful," "fast," "trustworthy"
(alone), "automated" — all either generic category convention or
actually contradict the claim ("automated" implies the AI just does it
unsupervised, the opposite of Hedgehog's pitch).

1. **Disciplined, not rigid** — the process enforces order without
   making the developer feel micromanaged.
2. **Load-bearing, not decorative** — the structure actually catches
   real breakage, not process theater.
3. **In control, not anxious** — the developer feels ahead of the code,
   not braced for it to fall apart later.
4. **Sober, not hyped** — plainspoken about a real failure mode, not a
   productivity high.
5. **Earned relief, not empty reassurance** — the calm comes from a
   specific mechanism (per-step verification), not a vibe.

Swap test: substituting a competitor/generic AI-tool page in,
"load-bearing, not decorative" and "earned relief, not empty
reassurance" don't transfer — they're pinned to the specific claim that
verification is mechanical and per-step. Passed.

## Step 3 — Visceral / Behavioral / Reflective sort (Psychologist)

| Pair | Layer |
|---|---|
| Sober, not hyped | Visceral |
| Disciplined, not rigid | Behavioral |
| In control, not anxious | Behavioral |
| Load-bearing, not decorative | Reflective |
| Earned relief, not empty reassurance | Reflective |

Only "sober, not hyped" is a first-impression/visual read. "Disciplined"
and "in control" are about how the page itself behaves as you scroll it
(pacing, structure) — it should enact the discipline, not just claim it.
"Load-bearing" and "earned relief" are trust judgments that land only
after the mechanism is understood — copy/structure carry these, not
visuals.

## Step 4c — Note timing, peak moment, ending treatment (Perfumer)

| Pair | Note |
|---|---|
| Sober, not hyped | Top — must be true on arrival |
| Disciplined, not rigid | Heart |
| In control, not anxious | Heart |
| Load-bearing, not decorative | Base — must hold from mechanism explanation through to the CTA |
| Earned relief, not empty reassurance | Base — must still be true at the footer |

**Peak moment:** where the page names the failure mode back to the
reader with enough specificity that they recognize their own project in
it ("AI code works, then drifts/breaks/becomes unreviewable as it
grows") — a recognition spike, not the hero and not the CTA.

**Ending treatment (specified separately):** quiet and procedural, not a
hype crescendo. The install command presented as the next small, checked
step — consistent with "disciplined, not rigid" and "load-bearing, not
decorative." A hyped ending would contradict the "sober, not hyped" top
note that opened the page.
