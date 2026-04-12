import { describe, expect, it } from "vitest";
import { parserOutputSchema } from "./schema";

describe("parser schema", () => {
  it("accepts null for optional parser fields and normalizes them to undefined", () => {
    const parsed = parserOutputSchema.parse({
      inferredType: "spell",
      confidence: 0.88,
      unresolvedQuestions: null,
      warnings: null,
      selectableOptions: [],
      parsed: {
        name: "Slow",
        kind: "spell",
        rankOrLevel: "Spell 3",
        traits: ["Concentrate", "Manipulate"],
        traditions: null,
        castOrActivate: null,
        usageBulk: null,
        rangeAreaTargets: "Range 30 feet; Targets 1 creature",
        defense: "Fortitude",
        frequencyTriggerEffect: null,
        description:
          "You dilate the flow of time around the target, slowing its actions.\nHeightened (6th) You can target up to 10 creatures.",
        computedValues: null,
        boldTokens: null,
        passiveEffects: null,
        grantedActions: null,
      },
    });

    expect(parsed.unresolvedQuestions).toEqual([]);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.parsed.usageBulk).toBeUndefined();
    expect(parsed.parsed.castOrActivate).toBeUndefined();
    expect(parsed.parsed.traditions).toBeUndefined();
    expect(parsed.parsed.computedValues).toBeUndefined();
  });
});
