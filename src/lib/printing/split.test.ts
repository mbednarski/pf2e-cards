import { describe, expect, it } from "vitest";
import { packPrintPages } from "./pack";
import { splitParsedCard } from "./split";
import type { BatchItem, ParsedCard } from "../../types";

const longDescription = Array.from({ length: 12 })
  .map((_, index) => `Paragraph ${index + 1}. Deals 6d6 damage over 30 feet.`)
  .join("\n\n");

const parsedCard: ParsedCard = {
  name: "Overflow Spell",
  kind: "spell",
  rankOrLevel: "Rank 5",
  traits: ["Fire", "Arcane"],
  description: longDescription,
  computedValues: ["Deals 10d6 damage."],
};

describe("split planning", () => {
  it("creates continuation names when a card overflows", () => {
    const parts = splitParsedCard(parsedCard, 420);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0].title).toMatch(/\(1\/\d+\)$/);
    expect(parts.at(-1)?.title).toMatch(/\(\d+\/\d+\)$/);
  });

  it("packs print pages from quantities and split cards", () => {
    const parts = splitParsedCard(parsedCard, 420);
    const batch: BatchItem[] = [
      {
        id: "batch-1",
        card: parsedCard,
        quantity: 2,
        warnings: [],
        plannedCards: parts,
        sourceText: "Example",
        addedAt: new Date().toISOString(),
      },
    ];

    const pages = packPrintPages(batch);
    const totalCards = pages.flat().length;

    expect(totalCards).toBe(parts.length * 2);
    expect(pages.length).toBeGreaterThanOrEqual(1);
  });
});
