# Systems

## Step 4a — Ingredient Director (dial table)

| Dial | Direction | Adjective driving it |
|---|---|---|
| **Color** — hue | Cool, desaturated neutrals (slate/graphite) as the base; one restrained accent hue, never warm/bright | Sober, not hyped (top note — must read cold-sober on arrival, before any argument is made) |
| **Color** — saturation | Low across the board; the accent is the only saturated element on the page, and even it sits mid-saturation, not neon | Sober, not hyped; Load-bearing, not decorative (a saturated page reads as trying to sell excitement rather than showing a mechanism) |
| **Color** — contrast level | High text/background contrast (near-black on near-white, or the inverse) — legibility as a trust signal, not a mood signal | In control, not anxious (a page that's easy to read fast doesn't ask the reader to work for calm) |
| **Color** — where withheld | Withhold color entirely from body copy and from the mechanism/proof sections — color only touches the accent and the CTA. Reserve it so it means something when it appears | Load-bearing, not decorative — color spent everywhere is color spent on nothing |
| **Type** — letterform character | Body: a grotesque/neo-grotesque sans with squared-off, engineered proportions (reads like tooling, not marketing). Display: the same family or a structurally-related monospace/grotesque pairing — no humanist warmth, no display serif | Sober, not hyped; Disciplined, not rigid (letterforms with visible construction logic, not expressive flourish) |
| **Type** — scale jump | Moderate, not dramatic (see ratio below) — a page selling calm shouldn't shout its own headline | Sober, not hyped; In control, not anxious |
| **Type** — tracking/leading | Tight tracking on headlines (engineered, deliberate), generous leading on body (room to breathe, not rushed) | Disciplined, not rigid — tight where it's structural, loose where the reader needs room, not uniformly cramped |
| **Type** — weight contrast | High: a heavy/bold display weight against a light-to-regular body weight, so hierarchy is legible at a glance, not by size alone | Load-bearing, not decorative (hierarchy earns its weight difference, it isn't just bigger) |
| **Space** — density | Generous, even margins; consistent gutter, no cramped proof sections | In control, not anxious — cramped layouts read as anxious/urgent |
| **Space** — margin around signature element | Wide, deliberate clearance — the element gets room, never crowded by copy | Disciplined, not rigid (structure treated with the same care it's arguing for) |
| **Space** — grid regularity | Strict grid as the default, with exactly one deliberate break at the peak moment (the recognition-of-failure-mode section) to mark it as different from the rest of the page | Disciplined, not rigid — the "not rigid" half licenses one break, placed on purpose, not scattered |
| **Motion** — easing curve | Linear-to-slight-ease-out, short duration (150–250ms) — motion that confirms an action happened, never motion that performs delight | Sober, not hyped; Earned relief, not empty reassurance (a bouncy/springy curve reads as manufactured feeling) |
| **Motion** — load sequencing | Sections resolve in fixed document order, no staggered/parallax reveal tricks | Disciplined, not rigid — the page's own behavior enacts "fixed order," not just claims it |
| **Motion** — presence/absence | Motion present only on state changes (hover, in-view reveal of proof points) — never ambient/looping | Load-bearing, not decorative — motion with no functional trigger is decoration |
| **Imagery/texture** | No photography, no illustration. Flat, abstracted diagrammatic marks only (the signature element family, step 6) — code/checklist-adjacent, not stock-photo developers-at-whiteboards | Load-bearing, not decorative; Sober, not hyped |
| **Form** | Hard edges, minimal corner radius, outlined more than filled, low depth (flat, near-zero shadow) | Sober, not hyped; Disciplined, not rigid — soft/rounded/shadowed forms read as consumer-friendly softness this brand doesn't want |
| **Form** — symmetry | Regular, grid-aligned symmetry as default | Disciplined, not rigid |

**Conflict resolution:** "Disciplined, not rigid" pulls toward strict grid/motion order (rigid-reading choices) while its own "not rigid" half demands at least one deliberate break. Resolved by giving the grid break and the color-withholding release both to the single peak-moment section (Step 2's failure-mode recognition) — one place earns the exception, everywhere else stays strict. This keeps "disciplined" as the dominant read without the page actually becoming inflexible.

## Step 4b — Voice Spec

**Sentence rhythm:** Short declarative sentences as the base unit (8–14 words). One dependent clause maximum per sentence — never stack two subordinate clauses. Paragraphs cap at 2–3 sentences. This is the copy-rhythm expression of "sober, not hyped" and "disciplined, not rigid": the prose itself moves in small, checked units, mirroring the build discipline being sold.

**Verb mode:** Active voice, present tense, by default. Second person ("you copy in," "you run," never "developers can copy in"). Imperative mood permitted only at the single CTA, nowhere else — reserving command voice for the one moment it's earned keeps every other line from reading as a sales push.

**Presupposition use (kairos-gated):** Presuppositional phrasing ("when you run the install command," not "if you run it") is permitted only after the peak-moment recognition section — before that point, the reader hasn't yet agreed rot is their problem, so presupposing the sale is premature and would read as hype. Before the peak moment: descriptive, conditional-neutral language. After it: presuppositional.

**User-side naming:** Never name the product's internal mechanism nouns first ("agents," "skills," "hooks") — open each claim from what the developer experiences ("your AI-written code starts drifting," "you stop trusting the diff") and only then name the Hedgehog mechanism that addresses it. Mechanism nouns are the payoff of a sentence, not its subject.

**VAK audit:** The failure-mode section (peak moment) leans tactile/kinesthetic — "watched it rot," "nothing catching it," "pile up" — because the target feeling there is visceral recognition, not visual description. The mechanism-explanation section (base note territory) leans visual/spatial — "each step," "checked before the next one starts" — matching "load-bearing" (a structural, seeable claim). No section should lean auditory; this brand doesn't talk about itself, it shows a structure.

**Reason-why discipline (Hopkins):** Every claim about reliability must cite the specific mechanism, never assert reliability alone.
- Not: "Hedgehog keeps your codebase correct."
- Yes: "Hedgehog keeps your codebase correct because each step gets checked before the next one starts — not because the model remembers the last one."

**Ethos/pathos/logos audit by section:**
- Hero (top note, sober): logos-leaning — state the mechanism claim plainly, no emotional appeal yet.
- Failure-mode recognition (peak moment): pathos — this is the one section allowed to name the reader's felt experience directly.
- Mechanism explanation (heart/base): logos — reason-why, one claim per line, no adjectives doing the work nouns and verbs should do.
- Close/CTA (base, "earned relief"): ethos — the calm here is earned by everything logos already proved, so the CTA line needs zero new persuasion, only the next procedural step.

**Omission:** No adjective from Step 2 appears as a literal word in the copy ("disciplined," "sober," "in control" are never printed) — they're structural targets for the writer, not vocabulary to reach for. Printing them directly would itself violate "sober, not hyped."

**Vetoed adjectives:** None. All five pairs from `landing-strategist` are concrete enough to write from directly — each already names a mechanism or a specific felt contrast, not an unwritable abstraction. No veto exercised at this step.

## Step 5 — Systems Designer (token system)

Reconciling 4a (visual dials) against 4b (voice) and the note-timing spec: both converge on restraint-with-one-earned-exception, so the token system is built as a tight, mostly-static system with exactly one section-scoped variation (the peak-moment section), matching the single grid/color break licensed in 4a and the pathos-only section licensed in 4b.

**Color** (4–6 named values, functioning as the `@theme` block's source of truth):

| Token | Value | Timing |
|---|---|---|
| `--color-ink` | `#14171a` (near-black, slight cool cast) | Static — body text throughout |
| `--color-paper` | `#f7f7f5` (near-white, warm-neutral paper, not clinical pure white) | Static — base background |
| `--color-graphite` | `#5b6169` (mid neutral) | Static — secondary text, borders |
| `--color-accent` | `#3a5c6e` (desaturated slate-teal, mid-saturation) | Top/heart: near-mute, low-saturation use (links, small marks). Base/CTA: same hue, no saturation increase — "earned relief" means the accent never spikes, it just becomes more present in area/frequency, not intensity |
| `--color-signal` | `#c14e34` (single warm, higher-saturation rust/red) | Reserved exclusively for the peak-moment section's break and the failure-mode marks — the one place color is "spent," per 4a's withholding rule |

**Type roles:** `--font-display` (headlines, section titles), `--font-body` (paragraph copy, UI labels). Two roles only — no separate "mono" role; code-adjacent character is carried by letterform choice within `--font-display`, not a third family.

**Typefaces:**
- Display: **Space Grotesk** (`@fontsource-variable/space-grotesk`) — squared, engineered grotesque with visible construction logic; reads as tooling, not marketing. Matches the letterform-character dial directly.
- Body: **Inter** (`@fontsource-variable/inter`) — restrained, high-legibility neo-grotesque, generous at small sizes, pairs structurally with Space Grotesk without competing for character.

```css
@import 'tailwindcss';
@import '@fontsource-variable/space-grotesk';
@import '@fontsource-variable/inter';

@theme {
  --font-display: 'Space Grotesk Variable', sans-serif;
  --font-body: 'Inter Variable', sans-serif;
}
```

**Type scale ratio:** **1.25 (Major Third)** — the "minimal/zen, trustworthy/calm" row. Matches "sober, not hyped" and "in control, not anxious" directly: contrast exists but doesn't shout. Body at `1rem`, display at `clamp(2.5rem, 5vw, 4rem)`.

| Token | Formula | Value |
|---|---|---|
| `--text-body` | base | `1rem` |
| `--text-lg` | body × 1.25 | `1.25rem` |
| `--text-h3` | body × 1.25² | `1.5625rem` |
| `--text-h2` | body × 1.25³ | `1.953rem` |
| `--text-h1` | body × 1.25⁴ | `2.441rem` |
| `--text-display` | `clamp(2.5rem, 5vw, 4rem)` (display ceiling, per ratio table) | fluid |

**Corner radius:** `--radius-base: 2px` — near-zero, hard edges per the Form dial. One ruling, no per-component overrides.

**Spacing unit:** `--space-unit: 0.5rem` (8px base), generous multiples (section padding at 12–16×unit) — expresses the "generous density" dial.

**Easing family:** `--ease-base: cubic-bezier(0.4, 0, 0.2, 1)` (standard ease-out), `--duration-base: 200ms` — confirms state changes without performing delight, per the Motion dial.

**Copy voice token (reference, not CSS):** sentence-rhythm and verb-mode rules from 4b apply uniformly; the only per-section variation is the pathos/logos/ethos audit above, not a typographic token.

## Step 6 — Signature Element

**Source:** Hedgehog's subject statement centers on "a fixed build order" checked "at every step" — the brief's own language: "small checked steps," "mistakes get caught before they pile up." The physical artifact in that world is not the hedgehog animal/logo — it's the **step-check itself**: a discrete, numbered link in a sequence, each one gated before the next begins. This maps to a **checklist tick / joined-segment marker** — the literal mechanism of "checked before the next one starts."

**Geometry personality:** Geometric-precise (not organic, not angular-expressive) — straight segments, right angles or precise arcs only, matching the Form dial's hard-edge, low-radius ruling.

**Element family:** A **step-joint mark** — a short horizontal or vertical segment with a small square/tick node at each end, chainable into a sequence (segment–node–segment–node). Family, not a single glyph: it can render as a single isolated node-pair (small, incidental — e.g. a bullet substitute in a proof list) or as a full joined chain (monumental — e.g. a horizontal spine dividing hero from the mechanism section).

**Persistence:** Evolves, not identical repetition. At small/incidental scale (list markers, inline emphasis) it appears as a single unlit node. At the peak-moment section it appears mid-chain, one node rendered in `--color-signal` against otherwise-neutral nodes — visually marking "this is the point being checked." At the base/CTA it appears as a completed chain, all nodes closed/filled — the motif's resolution, tying to "earned relief."

**Continuity:** Crosses section boundaries physically — a thin joint-chain can run as a vertical spine along one edge of the page, accumulating filled nodes as the reader scrolls past each proof point, so the element's own state tracks reading progress. This is the NLP-anchoring mechanism named in the role spec: the same mark, present at every emotionally-loaded moment (each proof point, the peak moment, the CTA), until the mark alone carries the "checked, not assumed" charge.

**Scale range:** Monumental — full-width spine at section transitions. Incidental — single node-pair as a list marker or inline mark next to a claim that's been "checked."

**Literalness:** Abstracted quality, not a literal checklist-app checkbox icon — the node-and-segment form reads as "joint in a sequence" without being a literal UI checkbox, keeping it out of icon-library territory per the constraint against generic decorative assets. Construction technique (the actual CSS/SVG recipe) is deferred to the `landing-shapes` skill at the Sequencer/Builder phase, per this role's scope.

## Self-test

- Every dial direction in 4a traces to a named adjective — confirmed per-row above; no row lacks an attribution.
- Ingredients move in agreement: color (cool, withheld, one accent), type (engineered grotesque, moderate scale, high weight-contrast), space (generous, strict grid), motion (short/confirming, fixed order), and copy rhythm (short declarative, active voice, mechanism-first) all point toward the same restrained, structurally-earned-calm direction. No dial contradicts another.
- Every claim in the voice spec needing a mechanism has a stated reason-why (see Hopkins example above); the spec itself instructs the same discipline downstream.
- Signature element source is traceable to the brief's own sentence: "small checked steps" / "mistakes get caught before they pile up" → step-joint mark. Not a generic decoration.
- Token system is the single source for spacing/color/type/motion — six color tokens, two font roles, one ratio, one radius, one spacing unit, one easing pair. Nothing downstream should need to invent a new value outside this set.
