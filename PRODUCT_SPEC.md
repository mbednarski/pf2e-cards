# PF2E Printable Cards — Product Requirements & Implementation Blueprint (v1)

## 1. Purpose

Build a browser application that converts pasted Archives of Nethys (AoN) text into printable, Pokémon-size Pathfinder 2e Remaster cards.

Primary goals:
- Reduce at-table math and lookup friction for players and GM.
- Support physical inventory play (e.g., three scrolls = three printed cards).
- Enable fast one-by-one intake and batch print/export on A4.

## 2. Scope

### In scope (MVP)
- One-by-one item ingestion flow:
  1) Paste AoN text block
  2) Parse and infer card type automatically
  3) Select rank/variant/level (when needed)
  4) Choose quantity
  5) Add to batch
- Supported content categories (auto-inferred):
  - Spells
  - Scrolls
  - Consumable items
  - Permanent items
  - Special actions/effects granted by items
- LLM-assisted extraction and value computation via OpenRouter.
- Print-ready A4 layout with fixed card size 63×88 mm.
- Direct print and PDF export.

### Out of scope (MVP)
- User-editable layout/theme designer.
- Multi-paper presets beyond A4.
- Account system/cloud sync.
- Server-side persistence.

## 3. Non-negotiable requirements

1. Full description text preservation:
   - Keep full flavor/mechanical description content.
   - Do **not** remove flavor text.
2. Exclude Deities metadata line from rendered card data.
3. Keep all traits.
4. Price policy for scrolls/items = **Option A (strict source-only)**:
   - Only use price if present in pasted source block.
   - If missing: leave null/blank and flag for review.
5. Block add-to-batch when parse/computation is uncertain until user confirms.
6. Overflow policy:
   - If content exceeds one card, split into `(1/2)`, `(2/2)`, etc.
7. Fully local user data:
   - No account; no mandatory backend for MVP.
   - User provides OpenRouter API key in browser.

## 4. User workflow

1) Open app
2) Enter OpenRouter API key (optionally store in local storage)
3) Paste single AoN text block
4) Click Parse
5) If scalable content is detected:
   - Select target spell rank (e.g., scroll rank)
   - or select item variant/level (e.g., Lesser/Moderate/Greater/Major)
6) Review parsed card preview + warnings
7) Set quantity
8) Add to batch
9) Repeat for next pasted block
10) Print or export batch to PDF (A4)

## 5. Card content rules

## 5.1 Spell / Scroll cards
Required fields:
- Name
- Rank (selected target rank)
- Traits
- Traditions (if present)
- Cast/Actions
- Range / Area / Targets (if present)
- Defense/save notation (e.g., basic Reflex)
- Description text (full, deities excluded)
- Computed final values for selected rank
- Price (for scroll only if present in source text)

Formatting rules:
- Mechanical rolls/numeric mechanics are bolded in display:
  - Dice expressions (e.g., 6d6)
  - DCs
  - Bonuses/penalties
  - HP values
  - Distances/ranges where appropriate

## 5.2 Item cards (consumable/permanent)
Required fields:
- Name
- Item level (selected variant level)
- Traits
- Usage/Bulk (if present)
- Activation/Frequency/Trigger (if present)
- Price (if present in selected variant source block)
- Description text (full, deities excluded)

For `Item X+` families:
- Parse generic block plus all listed variants.
- User selects one variant/level.
- Render only selected variant’s final mechanics and price.

## 5.3 Items that grant actions
- Include passive effects and granted action sections.
- Keep activation cadence fields (Frequency/Trigger/Effect) if present.

## 6. Parsing and computation strategy

Use an OpenRouter model to produce strict JSON output.

Pipeline:
1. Collect pasted text and user selection context (rank/variant/level)
2. Send prompt enforcing schema + extraction rules
3. Validate JSON shape client-side
4. Apply post-processing:
   - Bold token annotation
   - overflow split planning
5. If confidence low or unresolved fields exist, block add-to-batch and require confirmation.

Important:
- Computed scaling (e.g., heightened damage) may be LLM-derived.
- Ambiguities must be surfaced explicitly and confirmed by user.

## 7. Confidence and blocking policy

`Add to batch` must be disabled when any of the following are true:
- Missing required `name`
- Missing unresolved `rank_or_level`
- Scalable content detected without chosen target
- Price present but cannot be evidenced from source block (Option A violation)
- Model confidence below configured threshold
- `unresolved_questions` array non-empty

User can proceed only after explicit confirmation/edit.

## 8. Data model (suggested)

```ts
CardDraft {
  sourceText: string
  inferredType: 'spell' | 'scroll' | 'item' | 'action'
  selectableOptions?: Array<{ id: string; label: string; levelOrRank?: number }>
  selectedOptionId?: string
  confidence: number
  unresolvedQuestions: string[]
  parsed: ParsedCard
}

ParsedCard {
  name: string
  kind: 'spell' | 'scroll' | 'item' | 'action'
  rankOrLevel: string
  traits: string[]
  traditions?: string[]
  castOrActivate?: string
  usageBulk?: string
  rangeAreaTargets?: string
  defense?: string
  frequencyTriggerEffect?: string
  description: string
  priceGp?: string | null
  computedValues?: string[]
  boldTokens?: string[]
}

BatchItem {
  card: ParsedCard
  quantity: number
  splitPart?: { index: number; total: number }
}
```

## 9. Print layout constraints

- Paper: A4 only
- Card size: 63×88 mm fixed
- Fixed margins/gutters in mm
- No runtime layout customization in MVP
- Overflow split naming convention:
  - `Name (1/2)`
  - `Name (2/2)`

## 10. OpenRouter/API handling

- API key entered by user in browser.
- Optional local storage retention (opt-in).
- No backend required for MVP.
- Show warning that local device access can expose stored key.

## 11. Error handling

- Parse failure:
  - Show retry option
  - Preserve pasted text
- Schema validation failure:
  - Show model output error and retry button
- Ambiguous parse:
  - Highlight ambiguous fields
  - Block until user resolves

## 12. Acceptance criteria

1. Fireball-like heightened spell input supports target rank selection and displays computed final effect text.
2. Glue Bomb-style multi-variant item supports variant selection and selected variant rendering only.
3. Healer’s Gloves-style item with granted action includes passive + activation sections.
4. Deities line excluded; flavor text preserved.
5. Long text splits into linked `(1/2)` cards.
6. Batch supports quantity and A4 export/print.
7. Missing source price remains blank/null and does not hallucinate values.
8. App usable locally with user API key and without server account.

## 13. Implementation plan (handoff checklist)

Phase 1 — Project skeleton
- Choose frontend stack (React + TypeScript recommended)
- Add print styles and A4 container primitives
- Build local state for draft + batch

Phase 2 — Parsing integration
- Implement OpenRouter client wrapper
- Define strict JSON schema and validator
- Build parse/review flow with blocking rules

Phase 3 — Card rendering
- Build card component with metadata sections
- Implement bold token formatting
- Implement overflow splitting algorithm

Phase 4 — Batch and export
- Add batch list, quantity editing, remove/duplicate
- Add A4 pagination/packing
- Add print and PDF export path

Phase 5 — Hardening
- Add parse regression fixtures from representative AoN samples
- Validate print dimensions physically
- Improve ambiguity messaging and manual edit UX
