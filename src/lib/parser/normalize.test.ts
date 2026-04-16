import { describe, expect, it } from "vitest";
import { createReviewedDraft, extractRankNumber, normalizeRankOrLevel, priceHasSourceEvidence, stripDeitiesLine } from "./normalize";
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

  it("hard-blocks multi-variant items with missing rankOrLevel and no selection", () => {
    const draft = createReviewedDraft(
      "Darkvision Elixir\nAlchemical Consumable Elixir",
      {
        ...baseOutput,
        inferredType: "item",
        selectableOptions: [
          { id: "lesser", label: "Darkvision Elixir (Lesser)", levelOrRank: 2 },
          { id: "moderate", label: "Darkvision Elixir (Moderate)", levelOrRank: 4 },
        ],
        parsed: {
          ...baseOutput.parsed,
          name: "Darkvision Elixir",
          kind: "item",
          rankOrLevel: undefined,
        },
      },
      0.78,
    );

    expect(draft.hardBlocks).toContain("The parse is missing the final rank or level.");
    expect(draft.hardBlocks).toContain("Select a spell rank or item variant before adding this card.");
  });

  describe("normalizeRankOrLevel", () => {
    it("prepends 'Item' to a bare number for items", () => {
      expect(normalizeRankOrLevel("5", "item")).toBe("Item 5");
    });

    it("prepends 'Rank' to a bare number for spells", () => {
      expect(normalizeRankOrLevel("3", "spell")).toBe("Rank 3");
    });

    it("prepends 'Scroll' to a bare number for scrolls", () => {
      expect(normalizeRankOrLevel("7", "scroll")).toBe("Scroll 7");
    });

    it("leaves already-formatted values unchanged", () => {
      expect(normalizeRankOrLevel("Item 5", "item")).toBe("Item 5");
      expect(normalizeRankOrLevel("Rank 3", "spell")).toBe("Rank 3");
    });

    it("returns undefined for empty or missing values", () => {
      expect(normalizeRankOrLevel(undefined, "item")).toBeUndefined();
      expect(normalizeRankOrLevel("", "item")).toBeUndefined();
      expect(normalizeRankOrLevel("  ", "item")).toBeUndefined();
    });
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

  describe("extractRankNumber", () => {
    it("extracts number from 'Scroll 3'", () => {
      expect(extractRankNumber("Scroll 3")).toBe(3);
    });

    it("extracts number from 'Rank 5'", () => {
      expect(extractRankNumber("Rank 5")).toBe(5);
    });

    it("extracts bare number", () => {
      expect(extractRankNumber("7")).toBe(7);
    });

    it("returns null for undefined", () => {
      expect(extractRankNumber(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(extractRankNumber("")).toBeNull();
    });
  });

  describe("scroll price injection", () => {
    it("injects price for scroll with rank 3", () => {
      const draft = createReviewedDraft(
        "Fireball\nTraditions arcane, primal",
        {
          ...baseOutput,
          inferredType: "scroll",
          parsed: {
            ...baseOutput.parsed,
            kind: "scroll",
            rankOrLevel: "Scroll 3",
            priceGp: null,
          },
        },
        0.78,
      );

      expect(draft.parsed?.priceGp).toBe("30 gp");
    });

    it("does not hard-block scroll with auto-applied price", () => {
      const draft = createReviewedDraft(
        "Fireball\nTraditions arcane, primal",
        {
          ...baseOutput,
          inferredType: "scroll",
          parsed: {
            ...baseOutput.parsed,
            kind: "scroll",
            rankOrLevel: "Scroll 3",
            priceGp: null,
          },
        },
        0.78,
      );

      expect(draft.hardBlocks).not.toContain(
        "The parsed price is not evidenced in the pasted source text.",
      );
    });

    it("still hard-blocks non-scroll cards with unevidenced price", () => {
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

      expect(draft.hardBlocks).toContain(
        "The parsed price is not evidenced in the pasted source text.",
      );
    });

    it("does not inject price for non-scroll cards", () => {
      const draft = createReviewedDraft(
        "Fireball\nTraditions arcane, primal",
        {
          ...baseOutput,
          parsed: {
            ...baseOutput.parsed,
            priceGp: null,
          },
        },
        0.78,
      );

      expect(draft.parsed?.priceGp).toBeNull();
    });
  });
});
