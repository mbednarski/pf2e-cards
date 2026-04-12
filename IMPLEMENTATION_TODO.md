# Implementation TODO (v1 kickoff)

## Milestone 0 — Technical decisions
- [ ] Confirm framework (React + TypeScript + Vite suggested)
- [ ] Confirm PDF strategy (print CSS only vs jsPDF/PDF-lib)
- [ ] Select initial OpenRouter model ID

## Milestone 1 — Base app shell
- [ ] Setup app shell with pages:
  - Add Card
  - Batch
  - Print Preview
- [ ] Setup state management for:
  - current draft
  - parse result
  - batch items
  - API key settings

## Milestone 2 — Parsing contract
- [ ] Implement parser request payload and response validator
- [ ] Enforce strict schema parsing
- [ ] Add confidence + unresolved question handling
- [ ] Block Add-to-Batch when unresolved

## Milestone 3 — Core card rendering
- [ ] Render sections by type (spell/scroll/item/action)
- [ ] Keep full description text
- [ ] Exclude deities line only
- [ ] Bold numeric/roll tokens

## Milestone 4 — Variant/rank selection
- [ ] Render rank selector for heightened spells/scrolls
- [ ] Render variant selector for `Item X+` entries
- [ ] Recompute/refresh preview on selection changes

## Milestone 5 — Overflow splitting
- [ ] Measure rendered content overflow against card bounds
- [ ] Split into `(1/N)` continuation cards
- [ ] Preserve readability and section continuity

## Milestone 6 — Batch and print
- [ ] Quantity controls
- [ ] Duplicate/remove batch items
- [ ] A4 card packing with 63×88 mm cards
- [ ] Print stylesheet and PDF export

## Milestone 7 — Quality gates
- [ ] Test examples:
  - Fireball heightened
  - Glue Bomb variants
  - Healer's Gloves greater
- [ ] Verify price policy Option A (source-only)
- [ ] Verify deities omitted, flavor preserved
- [ ] Manual print calibration check
