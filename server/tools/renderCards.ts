import { homedir } from "os";
import { resolve } from "path";
import { z } from "zod";
import { generatePdf, type CardInput } from "../lib/pdf.js";

const cardInputSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["spell", "scroll", "item", "action"]),
  rankOrLevel: z.string().min(1),
  traits: z.array(z.string()),
  description: z.string(),
  quantity: z.number().int().min(1).default(1),
  traditions: z.array(z.string()).optional(),
  castOrActivate: z.string().optional(),
  rangeAreaTargets: z.string().optional(),
  defense: z.string().optional(),
  frequencyTriggerEffect: z.string().optional(),
  usageBulk: z.string().optional(),
  priceGp: z.string().optional(),
  passiveEffects: z.array(z.string()).optional(),
  grantedActions: z.array(z.string()).optional(),
  computedValues: z.array(z.string()).optional(),
  boldTokens: z.array(z.string()).optional(),
});

export const renderCardsSchema = z.object({
  cards: z.array(cardInputSchema).min(1),
  output_path: z.string().optional(),
});

export type RenderCardsInput = z.infer<typeof renderCardsSchema>;

function defaultOutputPath(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const outputDir = process.env["PF2E_CARDS_OUTPUT_DIR"]
    ? resolve(process.env["PF2E_CARDS_OUTPUT_DIR"])
    : resolve(homedir(), "pf2e-cards-output");
  return resolve(outputDir, `cards-${ts}.pdf`);
}

export async function renderCards(input: RenderCardsInput): Promise<{
  pdf_path: string;
  page_count: number;
  card_count: number;
}> {
  const cards = input.cards as CardInput[];
  const outputPath = input.output_path ? resolve(input.output_path) : defaultOutputPath();

  await generatePdf(cards, outputPath);

  const totalInstances = cards.reduce((sum, c) => sum + Math.max(1, c.quantity), 0);
  const pageCount = Math.ceil(totalInstances / 9);

  return {
    pdf_path: outputPath,
    page_count: pageCount,
    card_count: totalInstances,
  };
}
