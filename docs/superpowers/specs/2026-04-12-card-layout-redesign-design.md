# Card layout redesign — tight PF2E-native

## Problem

A simple spell like *Slow* (~350 chars of real content) currently splits across
**three** cards. Two causes compound:

1. `split.ts` estimates chrome as ~380 chars (base 140 + per-fact label weight
   where labels like `"Range / Area / Targets"` cost 23 chars each). That leaves
   only ~220 of the 600-char budget for body, forcing unnecessary chunking.
2. `CardFace.tsx` wastes vertical real estate: every summary fact is a bordered,
   padded mini-box in a fixed 2-column grid with labels often *longer* than
   their values. Traits are boxed pills. Lots of gap between sections.

## Goal

A *Slow*-shaped spell fits on a single 63×88 mm card with breathing room.
Genuinely long entries still split correctly with `(i/N)` numbering.
Card gains a distinctive PF2E aesthetic (serif title, action glyphs, inline
stat ladder, structured save ladder) instead of the current beige-panel look.

No changes to the parser, schema, normalization, store, or packing logic.
The redesign is surgical to render + splitter math.

## Visual design

```
┌────────────────────────────────────┐
│ SPELL · RANK 3              ◆◆     │  kind/rank left, action glyph right
│ Slow                               │  EB Garamond display, tight leading
│ ──                                 │  short kind-color accent rule
│ concentrate · manipulate           │  lowercase inline traits
│                                    │
│ Range 30 feet; 1 creature          │  inline stat row, small caps label
│ Defense Fortitude                  │
│                                    │
│ ╱ You dilate the flow of time…     │  italic flavor with leading-in mark
│                                    │
│ Crit. Success  unaffected.         │  structured save ladder
│ Success        slowed 1 / 1 round  │  right column is the outcome
│ Failure        slowed 1 / 1 minute │
│ Crit. Failure  slowed 2 / 1 minute │
│                                    │
│ Heightened (6th) Target up to 10.  │  bold leader, inline continuation
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ arcane · occult · primal           │  hairline above, muted traditions footer
└────────────────────────────────────┘
```

**Typography**

- Title: EB Garamond (Google Fonts). Warm serif, strong italics, reads well
  small, pulls the card away from the generic "Segoe UI" feel.
- Body: Source Sans 3. Humanist sans, legible at 7–8 pt print sizes.
- Labels: Source Sans 3 uppercased with tight tracking.
- Sizes: title ~13 pt · stat row 8 pt · body 7.5 pt · labels 6 pt.

**Color**

- Accent per kind: spell = red-brown `#8b2e1f`, scroll = moss-green, item =
  slate-teal, action = deep crimson.
- Card background: plain `#fdfbf5` parchment — **no gradients** (toner cost,
  content competition, generic feel).
- Only the accent ink changes between kinds; everything else is neutral.

## Rendering changes ([src/components/CardFace.tsx](../../../src/components/CardFace.tsx))

1. **Header**: one-line `SPELL · RANK 3` eyebrow, title, short accent rule,
   inline lowercase trait row (no pills, no `.trait-pill` boxes).
2. **Action glyph**: top-right corner. New `ActionGlyph` component maps
   `castOrActivate` strings (`"two-actions"`, `"one-action"`,
   `"three-actions"`, `"reaction"`, `"free-action"`) to inline SVG. Unknown
   values fall back to plain text.
3. **Stat row**: summary facts rendered inline. Each fact becomes
   `<span><em>ShortLabel</em> value</span>`, joined by middots. The long
   labels (`"Cast / Activate"`, `"Range / Area / Targets"`) are replaced with
   short display labels (`Range`, `Defense`, `Usage`, `Freq`, `Price`) in a
   CardFace-local map. `castOrActivate` is consumed by the action glyph and
   not rendered in the stat row. `traditions` is consumed by the footer.
4. **Save ladder detector**: when rendering a prose section, walk paragraphs
   and classify each:
   - `ladder` — starts with `Critical Success`, `Critical Failure`, `Success`,
     or `Failure` followed by space.
   - `heightened` — starts with `Heightened`.
   - `flavor` — everything else.

   Consecutive `ladder` paragraphs collapse into a single `<dl>` grid: labels
   in a right-aligned muted column, outcomes in a flex-right column.
   `heightened` renders as a paragraph with a bold leader. `flavor` renders as
   italic prose with a thin leading-in mark. Detection is pure string
   matching — no schema change, no parser change.
5. **Traditions footer**: if `traditions` summary fact is present, render at
   the bottom under a hairline divider, muted and italic.

## Splitter recalibration ([src/lib/printing/split.ts](../../../src/lib/printing/split.ts), [src/constants.ts](../../../src/constants.ts))

The estimation math should match the *rendered* layout. New constants:

| Constant                       | Current             | New   |
| ------------------------------ | ------------------- | ----- |
| `CARD_SECTION_CHARACTER_BUDGET`| 600                 | **850** |
| `BASE_CHROME_COST`             | 140                 | **70**  |
| `TRAIT_PILL_CHROME`            | 10                  | **2**   |
| `SUMMARY_FACT_CHROME`          | 6                   | **3**   |
| per-fact label weight          | `label.length`      | **dropped** |
| `SUMMARY_CELL_WIDTH` penalty   | on                  | **dropped** |
| `HIGHLIGHT_SECTION_CHROME`     | 30                  | **15**  |
| `PROSE_SECTION_CHROME`         | 10                  | **6**   |
| `MIN_BODY_BUDGET`              | 150                 | **250** |

Expected for *Slow*: overhead ~160, body budget ~690, content ~350 → **one
card, one part**. For a content-heavy item (>1500 chars) the splitter still
produces multiple parts.

## New file

- [src/components/ActionGlyph.tsx](../../../src/components/ActionGlyph.tsx) —
  inline SVG action-cost glyphs. Handles `one-action`, `two-actions`,
  `three-actions`, `reaction`, `free-action`. Falls back to `null` for
  unknown values so the caller can render plain text.

## Testing

- [src/lib/printing/split.test.ts](../../../src/lib/printing/split.test.ts):
  add an assertion that a *Slow*-sized spell (~350 chars of sections) produces
  exactly one part at the new default budget. Keep the existing overflow
  fixture (manually lowered budget) so the chunking invariants still run.
- [src/components/CardFace.test.tsx](../../../src/components/CardFace.test.tsx):
  rewrite DOM assertions for the new layout. New assertions:
  - Action glyph renders for `two-actions`.
  - Save ladder renders as a `<dl>` with labels `Success`, `Failure`,
    `Critical Failure` (and `Critical Success` when present).
  - Heightened paragraph renders with a bold `Heightened (6th)` leader.
  - Traditions render in the footer.
  - Legacy-persisted-data fallback still renders without crashing.
- `npm run typecheck` clean; `npm run test:run` green.
- Manual: dev server + Playwright screenshot of the print preview to confirm
  the 3×3 A4 grid and a *Slow* card fits on one part.

## Out of scope

- Parser / Zod schema / normalization changes.
- Store or persistence changes.
- Packing logic (`pack.ts`, `MAX_CARDS_PER_PAGE`).
- Decorative frame artwork, rarity gems, or illustration slots.
