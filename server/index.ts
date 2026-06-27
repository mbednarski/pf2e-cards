import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { renderCards, renderCardsSchema } from "./tools/renderCards.js";

const server = new McpServer({
  name: "pf2e-cards",
  version: "1.0.0",
});

server.tool(
  "render_cards",
  "Generate a print-ready A4 PDF of Pathfinder 2e spell/item/scroll cards. " +
    "Pass a list of cards with their data and an optional output path. " +
    "Returns the PDF file path and page/card counts.",
  {
    cards: z
      .array(
        z.object({
          name: z.string().min(1).describe("Card name, e.g. 'Fireball'"),
          kind: z
            .enum(["spell", "scroll", "item", "action"])
            .describe("Card type"),
          rankOrLevel: z
            .string()
            .min(1)
            .describe("e.g. 'Rank 5', 'Item 3', 'Scroll 7'"),
          traits: z.array(z.string()).describe("Trait list, e.g. ['fire', 'evocation']"),
          description: z
            .string()
            .describe("Full effect text with resolved values for the chosen rank"),
          quantity: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Number of copies to print"),
          traditions: z
            .array(z.string())
            .optional()
            .describe("Spell traditions, e.g. ['arcane', 'primal']"),
          castOrActivate: z
            .string()
            .optional()
            .describe("Activation line with action cost, e.g. 'Cast [two-actions] (somatic, verbal)'"),
          rangeAreaTargets: z
            .string()
            .optional()
            .describe("Range, area, and targeting info"),
          defense: z
            .string()
            .optional()
            .describe("Save type and DC, e.g. 'DC 22 basic Reflex save'"),
          frequencyTriggerEffect: z
            .string()
            .optional()
            .describe("Frequency, trigger, and requirements only"),
          usageBulk: z
            .string()
            .optional()
            .describe("Usage and bulk for items"),
          priceGp: z
            .string()
            .optional()
            .describe("Price in gp if present in source, e.g. '500 gp'"),
          passiveEffects: z
            .array(z.string())
            .optional()
            .describe("Passive benefits granted without activation"),
          grantedActions: z
            .array(z.string())
            .optional()
            .describe("Full granted-action descriptions including effect text"),
          computedValues: z
            .array(z.string())
            .optional()
            .describe("Quick-reference derived values"),
          boldTokens: z
            .array(z.string())
            .optional()
            .describe("Mechanical keywords to bold in card text"),
        }),
      )
      .min(1)
      .describe("One or more cards to include in the PDF"),
    output_path: z
      .string()
      .optional()
      .describe(
        "Absolute path for the output PDF. Defaults to ~/pf2e-cards-output/cards-{timestamp}.pdf",
      ),
  },
  async (input) => {
    const parsed = renderCardsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "Invalid input", details: parsed.error.issues }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await renderCards(parsed.data);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("pf2e-cards MCP server ready");
