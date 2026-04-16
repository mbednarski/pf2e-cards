export type CardKind = "spell" | "scroll" | "item" | "action";

export interface AppSettings {
  apiKey: string;
  persistApiKey: boolean;
  selectedModel: string;
  confidenceThreshold: number;
}

export interface SelectableOption {
  id: string;
  label: string;
  levelOrRank?: number;
  evidenceText?: string | null;
}

export interface ParsedCard {
  name: string;
  kind: CardKind;
  rankOrLevel: string;
  traits: string[];
  traditions?: string[];
  castOrActivate?: string;
  usageBulk?: string;
  rangeAreaTargets?: string;
  defense?: string;
  frequencyTriggerEffect?: string;
  description: string;
  priceGp?: string | null;
  sourcePriceEvidence?: string | null;
  computedValues?: string[];
  boldTokens?: string[];
  passiveEffects?: string[];
  grantedActions?: string[];
}

export interface ParserOutput {
  inferredType: CardKind;
  confidence: number;
  unresolvedQuestions: string[];
  warnings: string[];
  selectableOptions: SelectableOption[];
  parsed: ParsedCard;
}

export interface CardDraft {
  sourceText: string;
  inferredType?: CardKind;
  selectableOptions: SelectableOption[];
  selectedOptionId?: string;
  confidence: number;
  unresolvedQuestions: string[];
  warnings: string[];
  parsed?: ParsedCard;
  hardBlocks: string[];
  confirmWarnings: string[];
  quantity: number;
  status: "idle" | "parsing" | "parsed" | "error";
  errorMessage?: string;
  lastParsedAt?: string;
}

export interface CardFact {
  label: string;
  value: string;
}

export type CardSectionGroup = "highlight" | "prose";

export interface CardSection {
  label: string;
  content: string | string[];
  group: CardSectionGroup;
}

export interface SplitCard {
  id: string;
  title: string;
  partIndex: number;
  partTotal: number;
  kind: CardKind;
  rankOrLevel: string;
  traits: string[];
  summaryFacts: CardFact[];
  boldTokens?: string[];
  sections: CardSection[];
}

export interface BatchItem {
  id: string;
  card: ParsedCard;
  quantity: number;
  warnings: string[];
  plannedCards: SplitCard[];
  sourceText: string;
  selectedOptionId?: string;
  addedAt: string;
}

export interface PersistedState {
  settings: AppSettings;
  draft: CardDraft;
  batch: BatchItem[];
}

export type AppState = PersistedState;

export interface ParserRequest {
  sourceText: string;
  selectedOption?: SelectableOption;
  model: string;
  apiKey: string;
}

export interface ParserClient {
  parse(request: ParserRequest): Promise<ParserOutput>;
}

export interface PrintCardInstance {
  instanceId: string;
  batchItemId: string;
  quantityIndex: number;
  card: SplitCard;
}
