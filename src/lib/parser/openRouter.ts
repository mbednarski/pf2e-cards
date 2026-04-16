import { parserOutputSchema } from "./schema";
import { debugError, debugLog, maskSecret } from "../debug";
import type { ParserClient, ParserOutput, ParserRequest } from "../../types";

const SYSTEM_PROMPT = `You extract Pathfinder 2e Remaster card data from raw Archives of Nethys text.
Return strict JSON only.
Rules:
- Exclude the Deities metadata line from description output.
- Keep all traits.
- Use price only if it is explicitly present in the pasted source block.
- If price is present, include sourcePriceEvidence with the exact supporting source snippet.
- Infer kind as spell, scroll, item, or action.
- For scalable entries, emit selectableOptions and reflect the currently selected option in rankOrLevel and computedValues.
- Put unresolved ambiguity into unresolvedQuestions.
- Warnings should be concise and actionable.
- Never invent missing values. Use null or omit them.

Field rules — each piece of source text belongs in exactly ONE field. Never duplicate content across fields:
- description: ONLY flavor/narrative text. Do NOT include mechanical text (actions, effects, saves, frequency, price, usage) that belongs in other fields. Preserve all flavor text.
- castOrActivate: The activation name and action cost only (e.g. "Activate—Release Heat [one-action] (concentrate, fire)"). Do NOT include frequency, requirements, or effect text here.
- frequencyTriggerEffect: ONLY constraints — frequency, trigger, and requirements (e.g. "once per day; Requirements You have a free hand"). Do NOT include the Effect text itself.
- grantedActions: Full granted-action descriptions including the Effect text (e.g. "You take the heat that's built up in your gloves and discharge it onto an enemy. You deal 6d8 fire damage..."). One entry per action.
- passiveEffects: Passive benefits granted without activation (e.g. "Gain fire resistance 5 when wearing the gloves").
- computedValues: Quick-reference derived values that ADD info beyond passiveEffects — e.g. heightened scaling, variant stat changes. Do NOT repeat what is already in passiveEffects.
- defense: Save type and DC only (e.g. "DC 26 basic Reflex save").
- rangeAreaTargets: Range, area, and targeting info only.
`;

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain JSON.");
  }

  return text.slice(start, end + 1);
}

function readMessageContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return String(part.text);
        }

        return "";
      })
      .join("");
  }

  return "";
}

export class OpenRouterParserClient implements ParserClient {
  async parse(request: ParserRequest): Promise<ParserOutput> {
    const selectedOptionBlock = request.selectedOption
      ? `Selected option:\n- id: ${request.selectedOption.id}\n- label: ${request.selectedOption.label}\n- levelOrRank: ${request.selectedOption.levelOrRank ?? "n/a"}`
      : "Selected option: none";

    const userPrompt = `Source text:
"""
${request.sourceText}
"""

${selectedOptionBlock}

Return JSON shaped like:
{
  "inferredType": "spell" | "scroll" | "item" | "action",
  "confidence": 0.0,
  "unresolvedQuestions": [],
  "warnings": [],
  "selectableOptions": [{ "id": "string", "label": "string", "levelOrRank": 0, "evidenceText": "string|null" }],
  "parsed": {
    "name": "string",
    "kind": "spell" | "scroll" | "item" | "action",
    "rankOrLevel": "string",
    "traits": ["string"],
    "traditions": ["string"],
    "castOrActivate": "activation name + action cost only",
    "usageBulk": "string",
    "rangeAreaTargets": "range/area/targets only",
    "defense": "save type and DC only",
    "frequencyTriggerEffect": "constraints only — not the effect text",
    "description": "flavor/narrative only — no mechanical text from other fields",
    "priceGp": "string|null",
    "sourcePriceEvidence": "string|null",
    "computedValues": ["derived values not already in passiveEffects"],
    "boldTokens": ["string"],
    "passiveEffects": ["passive benefits without activation"],
    "grantedActions": ["full action effect text goes here"]
  }
}`;

    debugLog("parser", "Starting OpenRouter parse", {
      model: request.model,
      apiKey: maskSecret(request.apiKey),
      sourceLength: request.sourceText.length,
      selectedOption: request.selectedOption ?? null,
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      debugError("parser", "OpenRouter returned a non-OK response", message, {
        status: response.status,
      });
      throw new Error(`OpenRouter request failed (${response.status}): ${message}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      error?: { message?: string };
    };

    const message = payload.choices?.[0]?.message?.content;
    const text = readMessageContent(message);
    debugLog("parser", "Received raw model response", {
      preview: text.slice(0, 1200),
      totalLength: text.length,
    });

    try {
      const parsedJson = JSON.parse(extractJson(text));
      const parsed = parserOutputSchema.parse(parsedJson);
      debugLog("parser", "Validated parser payload", {
        inferredType: parsed.inferredType,
        confidence: parsed.confidence,
        selectableOptions: parsed.selectableOptions.length,
        warnings: parsed.warnings,
        unresolvedQuestions: parsed.unresolvedQuestions,
      });
      return parsed;
    } catch (error) {
      debugError("parser", "Failed to parse or validate model output", error, {
        rawResponse: text,
      });
      throw error;
    }
  }
}
