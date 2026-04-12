import { CARD_SECTION_CHARACTER_BUDGET } from "../../constants";
import type { CardSection, ParsedCard, SplitCard } from "../../types";

function sectionFromValue(label: string, value?: string | null) {
  if (!value) {
    return null;
  }

  return {
    label,
    content: value,
  } satisfies CardSection;
}

function sectionFromList(label: string, values?: string[]) {
  if (!values || values.length === 0) {
    return null;
  }

  return {
    label,
    content: values,
  } satisfies CardSection;
}

export function buildCardSections(card: ParsedCard): CardSection[] {
  const sections = [
    sectionFromValue("Kind", card.kind),
    sectionFromValue("Rank / Level", card.rankOrLevel),
    sectionFromList("Traits", card.traits),
    sectionFromList("Traditions", card.traditions),
    sectionFromValue("Cast / Activate", card.castOrActivate),
    sectionFromValue("Usage / Bulk", card.usageBulk),
    sectionFromValue("Range / Area / Targets", card.rangeAreaTargets),
    sectionFromValue("Defense", card.defense),
    sectionFromValue("Frequency / Trigger / Effect", card.frequencyTriggerEffect),
    sectionFromValue("Price", card.priceGp ?? undefined),
    sectionFromList("Computed Values", card.computedValues),
    sectionFromList("Passive Effects", card.passiveEffects),
    sectionFromList("Granted Actions", card.grantedActions),
    sectionFromValue("Description", card.description),
  ];

  return sections.filter((section): section is NonNullable<(typeof sections)[number]> => section !== null);
}

function estimateSectionSize(section: CardSection) {
  const content = Array.isArray(section.content) ? section.content.join(" ") : section.content;
  return section.label.length + content.length + 24;
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
    }));
  }

  const contentBudget = Math.max(200, budget - section.label.length - 24);
  return chunkText(section.content, contentBudget).map((chunk) => ({
    label: section.label,
    content: chunk,
  }));
}

export function splitParsedCard(card: ParsedCard, budget = CARD_SECTION_CHARACTER_BUDGET): SplitCard[] {
  const sections = buildCardSections(card);
  const parts: CardSection[][] = [];
  let currentPart: CardSection[] = [];
  let currentSize = 0;

  for (const section of sections) {
    const sectionSize = estimateSectionSize(section);
    const chunks = sectionSize <= budget ? [section] : chunkSection(section, budget);

    for (const chunk of chunks) {
      const chunkSize = estimateSectionSize(chunk);
      if (currentPart.length > 0 && currentSize + chunkSize > budget) {
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
    boldTokens: card.boldTokens,
    sections: partSections,
  }));
}
