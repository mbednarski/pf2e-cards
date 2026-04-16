import type { CardDraft, ParsedCard, ParserOutput } from "../../types";

function trimList(values?: string[]) {
  return values?.map((value) => value.trim()).filter(Boolean);
}

export function stripDeitiesLine(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => !/^Deities\b/i.test(line.trim()))
    .join("\n")
    .trim();
}

export function normalizeParsedCard(card: ParsedCard): ParsedCard {
  return {
    ...card,
    name: card.name.trim(),
    rankOrLevel: card.rankOrLevel?.trim(),
    description: stripDeitiesLine(card.description),
    traits: trimList(card.traits) ?? [],
    traditions: trimList(card.traditions),
    computedValues: trimList(card.computedValues),
    passiveEffects: trimList(card.passiveEffects),
    grantedActions: trimList(card.grantedActions),
    boldTokens: trimList(card.boldTokens),
    priceGp: card.priceGp?.trim() || null,
    sourcePriceEvidence: card.sourcePriceEvidence?.trim() || null,
    castOrActivate: card.castOrActivate?.trim() || undefined,
    usageBulk: card.usageBulk?.trim() || undefined,
    rangeAreaTargets: card.rangeAreaTargets?.trim() || undefined,
    defense: card.defense?.trim() || undefined,
    frequencyTriggerEffect: card.frequencyTriggerEffect?.trim() || undefined,
  };
}

export function normalizeParserOutput(output: ParserOutput): ParserOutput {
  return {
    ...output,
    unresolvedQuestions: trimList(output.unresolvedQuestions) ?? [],
    warnings: trimList(output.warnings) ?? [],
    selectableOptions: output.selectableOptions.map((option) => ({
      ...option,
      evidenceText: option.evidenceText?.trim() || null,
    })),
    parsed: normalizeParsedCard(output.parsed),
  };
}

function sourceIncludesText(sourceText: string, candidate: string) {
  return sourceText.toLowerCase().includes(candidate.toLowerCase());
}

export function priceHasSourceEvidence(sourceText: string, card: ParsedCard) {
  if (!card.priceGp) {
    return true;
  }

  if (card.sourcePriceEvidence) {
    return sourceIncludesText(sourceText, card.sourcePriceEvidence);
  }

  return sourceIncludesText(sourceText, card.priceGp);
}

export function createReviewedDraft(
  sourceText: string,
  output: ParserOutput,
  threshold: number,
  selectedOptionId?: string,
): CardDraft {
  const normalized = normalizeParserOutput(output);
  const hardBlocks: string[] = [];
  const confirmWarnings: string[] = [];
  const selectedOption = normalized.selectableOptions.find((option) => option.id === selectedOptionId);

  if (!normalized.parsed.name) {
    hardBlocks.push("The parse is missing a card name.");
  }

  if (!normalized.parsed.rankOrLevel) {
    hardBlocks.push("The parse is missing the final rank or level.");
  }

  if (normalized.selectableOptions.length > 0 && !selectedOptionId) {
    hardBlocks.push("Select a spell rank or item variant before adding this card.");
  }

  if (normalized.parsed.priceGp && !priceHasSourceEvidence(sourceText, normalized.parsed)) {
    hardBlocks.push("The parsed price is not evidenced in the pasted source text.");
  }

  if (normalized.confidence < threshold) {
    confirmWarnings.push(
      `Model confidence ${normalized.confidence.toFixed(2)} is below the threshold of ${threshold.toFixed(2)}.`,
    );
  }

  if (normalized.unresolvedQuestions.length > 0) {
    confirmWarnings.push(...normalized.unresolvedQuestions);
  }

  if (normalized.warnings.length > 0) {
    confirmWarnings.push(...normalized.warnings);
  }

  return {
    sourceText,
    inferredType: normalized.inferredType,
    selectableOptions: normalized.selectableOptions,
    selectedOptionId: selectedOption?.id ?? selectedOptionId,
    confidence: normalized.confidence,
    unresolvedQuestions: normalized.unresolvedQuestions,
    warnings: normalized.warnings,
    parsed: normalized.parsed,
    hardBlocks,
    confirmWarnings,
    quantity: 1,
    status: "parsed",
    lastParsedAt: new Date().toISOString(),
  };
}

export function canAddDraftToBatch(draft: CardDraft) {
  return Boolean(
    draft.status === "parsed" &&
      draft.parsed &&
      draft.hardBlocks.length === 0,
  );
}
