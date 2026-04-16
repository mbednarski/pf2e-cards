# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`tsc --noEmit`) then production build
- `npm run typecheck` — typecheck only
- `npm run test` — vitest in watch mode
- `npm run test:run` — vitest single run (use in CI / for verification)
- Run a single test file: `npx vitest run src/lib/parser/normalize.test.ts`
- Run tests matching a name: `npx vitest run -t "canAddDraftToBatch"`

Tests use jsdom + Testing Library. Global setup lives in [src/test/setup.ts](src/test/setup.ts) and clears `localStorage` before each test.

## Architecture

Single-page React 19 + TypeScript + Vite app. Fully client-side; no backend. Persists to `localStorage` under key `pf2e-cards:v1`.

### Data flow

Pasted AoN text → OpenRouter LLM parse → Zod schema validation → normalization → draft review → batch → A4 print pagination. The pipeline is encoded in these layers:

1. **Parser** ([src/lib/parser/](src/lib/parser/))
   - [openRouter.ts](src/lib/parser/openRouter.ts) is the only network boundary. Calls OpenRouter chat completions with a strict system prompt and `response_format: json_object`. Key is supplied per-request by the user.
   - [schema.ts](src/lib/parser/schema.ts) is the Zod contract for `ParserOutput`. All model JSON must pass this.
   - [normalize.ts](src/lib/parser/normalize.ts) turns a validated `ParserOutput` into a reviewed `CardDraft`. This is where the **blocking policy** lives: `createReviewedDraft` computes `hardBlocks` (must-fix: missing name/rank, unselected variant, unevidenced price) and `confirmWarnings` (soft: low confidence, unresolved questions). `canAddDraftToBatch` gates the "Add to batch" action on these.

2. **Printing** ([src/lib/printing/](src/lib/printing/))
   - [split.ts](src/lib/printing/split.ts) implements the overflow rule from the spec: a `ParsedCard` is chunked into one or more `SplitCard` parts titled `Name (i/N)`. Budget comes from `CARD_SECTION_CHARACTER_BUDGET`. Splitting happens at batch-insert time (see `createBatchItem` in [src/store.tsx](src/store.tsx)), not at render time.
   - [pack.ts](src/lib/printing/pack.ts) expands a `BatchItem[]` into `PrintCardInstance[]` (one per quantity × split part) and pages them by `MAX_CARDS_PER_PAGE` (currently 9, for A4 with 63×88 mm cards).

3. **State** ([src/store.tsx](src/store.tsx))
   - Single `useReducer` store exposed via `AppStoreProvider` / `useAppStore`. All mutations go through the `Action` union. No external state library.
   - Persistence is a `useEffect` that writes to `localStorage` via [src/lib/storage/localStorage.ts](src/lib/storage/localStorage.ts). `sanitizePersistedState` drops the API key unless `persistApiKey` is set and coerces a `"parsing"` draft back to `"idle"` on reload.
   - Tests can inject a fake `ParserClient` via `<App parser={fake} />` — `App` defaults to `new OpenRouterParserClient()`.

4. **UI** ([src/features/](src/features/))
   - Views are `add` (DraftView), `batch` (BatchView), `print` (PrintPreviewView), plus a persistent `SettingsPanel` sidebar. Switched by `state.currentView`, not a router.
   - [src/components/CardFace.tsx](src/components/CardFace.tsx) renders a `SplitCard`. Bold-token annotation is in [src/lib/formatting.tsx](src/lib/formatting.tsx).

### Key invariants (from PRODUCT_SPEC.md)

These are enforced in code and must not be relaxed without changing the spec:

- **Price policy is Option A (strict source-only).** `priceHasSourceEvidence` in normalize.ts checks the parsed price (or the model-provided `sourcePriceEvidence`) against the original pasted text. If a price is present but unevidenced, it becomes a hard block. Never synthesize prices.
- **Deities line is stripped, flavor text is preserved.** `stripDeitiesLine` filters lines beginning with `Deities` before the card is stored. Do not add other description filtering.
- **Add-to-batch is blocked on uncertainty.** Low confidence, unresolved questions, or warnings turn into `confirmWarnings` that require explicit user confirmation (`draft.confirmed`). Bypassing this defeats the spec's review model.
- **Overflow splits into `(i/N)` parts**, it does not truncate. Splitting runs once at batch-insert time — if you change split logic, re-split existing batch items rather than splitting at render.

### Spec documents

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md) is the source of truth for what the app must do (card content rules, blocking policy, print layout). Read it before changing parse/normalization/split behavior.
- [IMPLEMENTATION_TODO.md](IMPLEMENTATION_TODO.md) is the original kickoff checklist — historical, not a live roadmap.

## Debug logging

Set `localStorage['pf2e-cards:debug'] = 'true'` (or run in Vite dev mode) to enable scoped console logs via [src/lib/debug.ts](src/lib/debug.ts). The parser logs mask the API key with `maskSecret`.
