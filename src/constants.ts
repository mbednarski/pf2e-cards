import type { AppSettings, CardDraft, PersistedState } from "./types";

export const STORAGE_KEY = "pf2e-cards:v1";
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5-20241022";
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.78;
export const CARD_SECTION_CHARACTER_BUDGET = 1200;
export const MAX_CARDS_PER_PAGE = 9;

export const SCROLL_PRICES_BY_RANK: Record<number, string> = {
  1: "4 gp",
  2: "12 gp",
  3: "30 gp",
  4: "70 gp",
  5: "150 gp",
  6: "300 gp",
  7: "600 gp",
  8: "1,300 gp",
  9: "3,000 gp",
  10: "8,000 gp",
};

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  persistApiKey: false,
  selectedModel: DEFAULT_MODEL,
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
};

export const EMPTY_DRAFT: CardDraft = {
  sourceText: "",
  selectableOptions: [],
  confidence: 0,
  unresolvedQuestions: [],
  warnings: [],
  hardBlocks: [],
  confirmWarnings: [],
  quantity: 1,
  status: "idle",
};

export const INITIAL_STATE: PersistedState = {
  settings: DEFAULT_SETTINGS,
  draft: EMPTY_DRAFT,
  batch: [],
};
