import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().optional(),
);

const optionalTrimmedStringArray = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(z.string().trim().min(1)).optional(),
);

const defaultTrimmedStringArray = z.preprocess(
  (value) => (value === null ? [] : value),
  z.array(z.string().trim()).default([]),
);

export const selectableOptionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  levelOrRank: z.number().int().optional(),
  evidenceText: z.string().trim().nullable().optional(),
});

export const parsedCardSchema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(["spell", "scroll", "item", "action"]),
  rankOrLevel: optionalTrimmedString,
  traits: z.array(z.string().trim().min(1)).default([]),
  traditions: optionalTrimmedStringArray,
  castOrActivate: optionalTrimmedString,
  usageBulk: optionalTrimmedString,
  rangeAreaTargets: optionalTrimmedString,
  defense: optionalTrimmedString,
  frequencyTriggerEffect: optionalTrimmedString,
  description: z.string().trim().min(1),
  priceGp: z.string().trim().nullable().optional(),
  sourcePriceEvidence: z.string().trim().nullable().optional(),
  computedValues: optionalTrimmedStringArray,
  boldTokens: optionalTrimmedStringArray,
  passiveEffects: optionalTrimmedStringArray,
  grantedActions: optionalTrimmedStringArray,
});

export const parserOutputSchema = z.object({
  inferredType: z.enum(["spell", "scroll", "item", "action"]),
  confidence: z.number().min(0).max(1),
  unresolvedQuestions: defaultTrimmedStringArray,
  warnings: defaultTrimmedStringArray,
  selectableOptions: z.array(selectableOptionSchema).default([]),
  parsed: parsedCardSchema,
});
