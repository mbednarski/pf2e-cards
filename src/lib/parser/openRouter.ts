import { parserOutputSchema } from "./schema";
import { debugError, debugLog, maskSecret } from "../debug";
import type { ParserClient, ParserOutput, ParserRequest } from "../../types";

const SYSTEM_PROMPT = `You extract Pathfinder 2e Remaster card data from raw Archives of Nethys text.
Return strict JSON only.
Rules:
- Preserve full mechanical and flavor description text.
- Remove no flavor text.
- Exclude the Deities metadata line from description output.
- Keep all traits.
- Use price only if it is explicitly present in the pasted source block.
- If price is present, include sourcePriceEvidence with the exact supporting source snippet.
- Infer kind as spell, scroll, item, or action.
- For scalable entries, emit selectableOptions and reflect the currently selected option in rankOrLevel and computedValues.
- Put unresolved ambiguity into unresolvedQuestions.
- Warnings should be concise and actionable.
- Never invent missing values. Use null or omit them.
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
    "castOrActivate": "string",
    "usageBulk": "string",
    "rangeAreaTargets": "string",
    "defense": "string",
    "frequencyTriggerEffect": "string",
    "description": "string",
    "priceGp": "string|null",
    "sourcePriceEvidence": "string|null",
    "computedValues": ["string"],
    "boldTokens": ["string"],
    "passiveEffects": ["string"],
    "grantedActions": ["string"]
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
