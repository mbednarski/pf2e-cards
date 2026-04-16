import { CARD_SECTION_CHARACTER_BUDGET } from "../../constants";
import type { CardFact, CardKind, CardSection, ParsedCard, SplitCard } from "../../types";

type SummaryFieldKey =
  | "traditions"
  | "castOrActivate"
  | "usageBulk"
  | "rangeAreaTargets"
  | "defense"
  | "frequencyTriggerEffect"
  | "priceGp";

const FIELD_LABELS: Record<SummaryFieldKey, string> = {
  traditions: "Traditions",
  castOrActivate: "Cast / Activate",
  usageBulk: "Usage / Bulk",
  rangeAreaTargets: "Range / Area / Targets",
  defense: "Defense",
  frequencyTriggerEffect: "Frequency / Trigger / Effect",
  priceGp: "Price",
};

const SUMMARY_FIELD_ORDER: Record<CardKind, SummaryFieldKey[]> = {
  spell: ["castOrActivate", "rangeAreaTargets", "defense", "traditions", "priceGp"],
  scroll: ["castOrActivate", "rangeAreaTargets", "defense", "traditions", "priceGp"],
  item: ["usageBulk", "castOrActivate", "frequencyTriggerEffect", "defense", "priceGp"],
  action: ["usageBulk", "castOrActivate", "frequencyTriggerEffect", "defense", "priceGp"],
};

const ALL_SUMMARY_FIELDS = Object.keys(FIELD_LABELS) as SummaryFieldKey[];

function sectionFromValue(label: string, value: string | null | undefined, group: CardSection["group"]) {
  if (!value) {
    return null;
  }

  return {
    label,
    content: value,
    group,
  } satisfies CardSection;
}

function sectionFromList(label: string, values: string[] | undefined, group: CardSection["group"]) {
  if (!values || values.length === 0) {
    return null;
  }

  return {
    label,
    content: values,
    group,
  } satisfies CardSection;
}

function getSummaryFieldValue(card: ParsedCard, field: SummaryFieldKey) {
  const rawValue = card[field];

  if (Array.isArray(rawValue)) {
    return rawValue.join(", ");
  }

  return rawValue?.trim() || undefined;
}

function getOrderedSummaryFields(kind: CardKind) {
  const preferred = SUMMARY_FIELD_ORDER[kind];
  return [...preferred, ...ALL_SUMMARY_FIELDS.filter((field) => !preferred.includes(field))];
}

export function buildCardSummaryFacts(card: ParsedCard): CardFact[] {
  return getOrderedSummaryFields(card.kind).flatMap((field) => {
    const value = getSummaryFieldValue(card, field);
    if (!value) {
      return [];
    }

    return [
      {
        label: FIELD_LABELS[field],
        value,
      },
    ];
  });
}

export function buildCardSections(card: ParsedCard): CardSection[] {
  const sections = [
    sectionFromList("Computed Values", card.computedValues, "highlight"),
    sectionFromList("Passive Effects", card.passiveEffects, "highlight"),
    sectionFromList("Granted Actions", card.grantedActions, "highlight"),
    sectionFromValue("Description", card.description, "prose"),
  ];

  return sections.filter((section): section is NonNullable<(typeof sections)[number]> => section !== null);
}

const HIGHLIGHT_SECTION_CHROME = 15;
const PROSE_SECTION_CHROME = 6;

function estimateSectionSize(section: CardSection) {
  const content = Array.isArray(section.content) ? section.content.join(" ") : section.content;
  const chromeWeight = section.group === "highlight" ? HIGHLIGHT_SECTION_CHROME : PROSE_SECTION_CHROME;
  return section.label.length + content.length + chromeWeight;
}

const BASE_CHROME_COST = 70;
const TRAIT_INLINE_CHROME = 2;
const SUMMARY_FACT_CHROME = 3;
const MAX_FACT_OVERHEAD = 60;
const MIN_BODY_BUDGET = 250;
const MIN_CHUNK_BUDGET = 200;

function estimateRepeatedOverhead(card: ParsedCard, summaryFacts: CardFact[]) {
  const traitWeight = card.traits.reduce((sum, trait) => sum + trait.length + TRAIT_INLINE_CHROME, 0);
  const summaryWeight = summaryFacts.reduce(
    (sum, fact) => sum + Math.min(fact.value.length, MAX_FACT_OVERHEAD) + SUMMARY_FACT_CHROME,
    0,
  );

  return BASE_CHROME_COST + card.name.length + traitWeight + summaryWeight;
}

function chunkText(text: string, budget: number) {
  const paragraphs = text.split(/\n{2,}/).flatMap((paragraph) => {
    if (paragraph.length <= budget) {
      return [paragraph];
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
      if ((current + " " + sentence).trim().length <= budget) {
        current = `${current} ${sentence}`.trim();
        continue;
      }

      if (current) {
        chunks.push(current);
        current = sentence;
        continue;
      }

      let remainder = sentence;
      while (remainder.length > budget) {
        const cutPoint = remainder.lastIndexOf(" ", budget);
        const nextChunk = remainder.slice(0, cutPoint > 0 ? cutPoint : budget).trim();
        chunks.push(nextChunk);
        remainder = remainder.slice(nextChunk.length).trim();
      }

      current = remainder;
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  });

  return paragraphs.filter(Boolean);
}

function chunkSection(section: CardSection, budget: number): CardSection[] {
  if (Array.isArray(section.content)) {
    return section.content.map((entry) => ({
      label: section.label,
      content: entry,
      group: section.group,
    }));
  }

  const contentBudget = Math.max(MIN_CHUNK_BUDGET, budget - section.label.length - 18);
  return chunkText(section.content, contentBudget).map((chunk) => ({
    label: section.label,
    content: chunk,
    group: section.group,
  }));
}

export function splitParsedCard(card: ParsedCard, budget = CARD_SECTION_CHARACTER_BUDGET): SplitCard[] {
  const summaryFacts = buildCardSummaryFacts(card);
  const sections = buildCardSections(card);
  const bodyBudget = Math.max(MIN_BODY_BUDGET, budget - estimateRepeatedOverhead(card, summaryFacts));
  const parts: CardSection[][] = [];
  let currentPart: CardSection[] = [];
  let currentSize = 0;

  for (const section of sections) {
    const sectionSize = estimateSectionSize(section);
    const chunks = sectionSize <= bodyBudget ? [section] : chunkSection(section, bodyBudget);

    for (const chunk of chunks) {
      const chunkSize = estimateSectionSize(chunk);
      if (currentPart.length > 0 && currentSize + chunkSize > bodyBudget) {
        parts.push(currentPart);
        currentPart = [];
        currentSize = 0;
      }

      currentPart.push(chunk);
      currentSize += chunkSize;
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  const total = parts.length || 1;

  return (parts.length > 0 ? parts : [[]]).map((partSections, index) => ({
    id: `${card.name}-${index + 1}`,
    title: total > 1 ? `${card.name} (${index + 1}/${total})` : card.name,
    partIndex: index + 1,
    partTotal: total,
    kind: card.kind,
    rankOrLevel: card.rankOrLevel,
    traits: card.traits,
    summaryFacts,
    boldTokens: card.boldTokens,
    sections: partSections,
  }));
}
