import type { AppSettings, CardDraft, PersistedState } from "./types";

export const STORAGE_KEY = "pf2e-cards:v1";
export const DEFAULT_MODEL = "openai/gpt-4.1-mini";
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.78;
export const CARD_SECTION_CHARACTER_BUDGET = 850;
export const MAX_CARDS_PER_PAGE = 9;

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
  confirmed: false,
  status: "idle",
};

export const INITIAL_STATE: PersistedState = {
  settings: DEFAULT_SETTINGS,
  draft: EMPTY_DRAFT,
  batch: [],
};
