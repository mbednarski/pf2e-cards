import { describe, expect, it } from "vitest";
import { createReviewedDraft, priceHasSourceEvidence, stripDeitiesLine } from "./normalize";
import type { ParserOutput } from "../../types";

const baseOutput: ParserOutput = {
  inferredType: "spell",
  confidence: 0.92,
  unresolvedQuestions: [],
  warnings: [],
  selectableOptions: [],
  parsed: {
    name: "Fireball",
    kind: "spell",
    rankOrLevel: "Rank 3",
    traits: ["Fire", "Evocation"],
    description: "A roaring blast.\nDeities Sarenrae\nDeals 6d6 fire damage.",
    computedValues: ["Deals 6d6 fire damage."],
  },
};

describe("normalize helpers", () => {
  it("removes only the Deities line from descriptions", () => {
    expect(stripDeitiesLine(baseOutput.parsed.description)).toBe(
      "A roaring blast.\nDeals 6d6 fire damage.",
    );
  });

  it("hard-blocks prices without source evidence", () => {
    const draft = createReviewedDraft(
      "Fireball\nTraditions arcane, primal",
      {
        ...baseOutput,
        parsed: {
          ...baseOutput.parsed,
          priceGp: "12 gp",
        },
      },
      0.78,
    );

    expect(draft.hardBlocks).toContain("The parsed price is not evidenced in the pasted source text.");
  });

  it("requires confirmation for low-confidence parses", () => {
    const draft = createReviewedDraft(
      "Fireball\nPrice 12 gp",
      {
        ...baseOutput,
        confidence: 0.5,
        unresolvedQuestions: ["Choose a target rank."],
        parsed: {
          ...baseOutput.parsed,
          priceGp: "12 gp",
          sourcePriceEvidence: "Price 12 gp",
        },
      },
      0.78,
    );

    expect(draft.confirmWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("below the threshold"),
        "Choose a target rank.",
      ]),
    );
  });

  it("accepts prices when the evidence is present in the source", () => {
    expect(
      priceHasSourceEvidence("Price 12 gp", {
        ...baseOutput.parsed,
        priceGp: "12 gp",
        sourcePriceEvidence: "Price 12 gp",
      }),
    ).toBe(true);
  });
});
