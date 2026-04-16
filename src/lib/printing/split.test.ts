import { describe, expect, it } from "vitest";
import { packPrintPages } from "./pack";
import { buildCardSections, buildCardSummaryFacts, splitParsedCard } from "./split";
import type { BatchItem, ParsedCard } from "../../types";

const longDescription = Array.from({ length: 12 })
  .map((_, index) => `Paragraph ${index + 1}. Deals 6d6 damage over 30 feet.`)
  .join("\n\n");

const parsedCard: ParsedCard = {
  name: "Overflow Spell",
  kind: "spell",
  rankOrLevel: "Rank 5",
  traits: ["Fire", "Arcane"],
  traditions: ["arcane", "primal"],
  castOrActivate: "two-actions",
  rangeAreaTargets: "120 feet; 20-foot burst",
  defense: "basic Reflex",
  description: longDescription,
  computedValues: ["Deals 10d6 damage."],
};

describe("split planning", () => {
  it("builds spell summary facts in tactical order", () => {
    const facts = buildCardSummaryFacts(parsedCard);

    expect(facts.map((fact) => fact.label)).toEqual([
      "Cast / Activate",
      "Range / Area / Targets",
      "Defense",
      "Traditions",
    ]);
  });

  it("groups highlight sections separately from prose", () => {
    expect(buildCardSections(parsedCard)).toEqual([
      {
        label: "Computed Values",
        content: ["Deals 10d6 damage."],
        group: "highlight",
      },
      {
        label: "Description",
        content: longDescription,
        group: "prose",
      },
    ]);
  });

  it("maps item facts and action sections into the new hierarchy", () => {
    const itemCard: ParsedCard = {
      name: "Healer's Gloves",
      kind: "item",
      rankOrLevel: "Item 4",
      traits: ["Healing", "Invested", "Magical"],
      usageBulk: "Worn gloves; L",
      castOrActivate: "Interact",
      frequencyTriggerEffect: "Frequency once per day",
      defense: "Fortitude",
      priceGp: "80 gp",
      passiveEffects: ["You can patch wounds while wearing the gloves."],
      grantedActions: ["Soothe hands: restore 2d6+7 HP."],
      description: "These clean white gloves are favored by battle medics.",
    };

    expect(buildCardSummaryFacts(itemCard).map((fact) => fact.label)).toEqual([
      "Usage / Bulk",
      "Cast / Activate",
      "Frequency / Trigger / Effect",
      "Defense",
      "Price",
    ]);

    expect(buildCardSections(itemCard)).toEqual([
      {
        label: "Passive Effects",
        content: ["You can patch wounds while wearing the gloves."],
        group: "highlight",
      },
      {
        label: "Granted Actions",
        content: ["Soothe hands: restore 2d6+7 HP."],
        group: "highlight",
      },
      {
        label: "Description",
        content: "These clean white gloves are favored by battle medics.",
        group: "prose",
      },
    ]);
  });

  it("fits a simple spell like Slow on a single card at the default budget", () => {
    const slowDescription = [
      "You dilate the flow of time around the target, slowing its actions.",
      "Saving Throw Fortitude",
      "Critical Success The target is unaffected.",
      "Success The target is slowed 1 for 1 round.",
      "Failure The target is slowed 1 for 1 minute.",
      "Critical Failure The target is slowed 2 for 1 minute.",
    ].join("\n\n");

    const slow: ParsedCard = {
      name: "Slow",
      kind: "spell",
      rankOrLevel: "Rank 3",
      traits: ["Concentrate", "Manipulate"],
      traditions: ["arcane", "occult", "primal"],
      castOrActivate: "two-actions",
      rangeAreaTargets: "30 feet; 1 creature",
      defense: "Fortitude",
      description: slowDescription,
      computedValues: ["Heightened (6th): You can target up to 10 creatures."],
    };

    const parts = splitParsedCard(slow);

    expect(parts).toHaveLength(1);
    expect(parts[0].title).toBe("Slow");
    expect(parts[0].partIndex).toBe(1);
    expect(parts[0].partTotal).toBe(1);
  });

  it("creates continuation names when a card overflows", () => {
    const parts = splitParsedCard(parsedCard, 420);
    const summarySignature = parts[0].summaryFacts.map((fact) => `${fact.label}:${fact.value}`).join("|");

    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0].title).toMatch(/\(1\/\d+\)$/);
    expect(parts.at(-1)?.title).toMatch(/\(\d+\/\d+\)$/);
    expect(
      parts.every(
        (part) => part.summaryFacts.map((fact) => `${fact.label}:${fact.value}`).join("|") === summarySignature,
      ),
    ).toBe(true);
    expect(parts.every((part) => part.traits.join("|") === parsedCard.traits.join("|"))).toBe(true);
  });

  it("emits all four body sections together when the card has every content type", () => {
    const denseCard: ParsedCard = {
      name: "Grand Ritual Focus",
      kind: "item",
      rankOrLevel: "Item 12",
      traits: ["Magical", "Ritual"],
      usageBulk: "Held in 1 hand; 1",
      castOrActivate: "Activate 1 minute",
      description: "A crystal orb pulses with stored magic.",
      computedValues: ["DC 28 save"],
      passiveEffects: ["+2 status bonus to ritual checks."],
      grantedActions: ["Channel Power: spend a Focus Point to heighten the ritual."],
    };

    const sections = buildCardSections(denseCard);

    expect(sections.map((section) => section.label)).toEqual([
      "Computed Values",
      "Passive Effects",
      "Granted Actions",
      "Description",
    ]);
    expect(sections.map((section) => section.group)).toEqual(["highlight", "highlight", "highlight", "prose"]);
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
