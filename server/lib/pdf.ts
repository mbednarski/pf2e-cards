import { readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { chromium } from "playwright";

import { normalizeParsedCard } from "../../src/lib/parser/normalize.js";
import { splitParsedCard } from "../../src/lib/printing/split.js";
import { packPrintPages } from "../../src/lib/printing/pack.js";
import CardFace from "../../src/components/CardFace.js";
import { buildHtmlDocument } from "./html.js";
import type { BatchItem, ParsedCard } from "../../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLES_PATH = resolve(__dirname, "../../src/styles.css");

export interface CardInput {
  name: string;
  kind: "spell" | "scroll" | "item" | "action";
  rankOrLevel: string;
  traits: string[];
  description: string;
  quantity: number;
  traditions?: string[];
  castOrActivate?: string;
  rangeAreaTargets?: string;
  defense?: string;
  frequencyTriggerEffect?: string;
  usageBulk?: string;
  priceGp?: string;
  passiveEffects?: string[];
  grantedActions?: string[];
  computedValues?: string[];
  boldTokens?: string[];
}

function cardInputToParseCard(input: CardInput): ParsedCard {
  return {
    name: input.name,
    kind: input.kind,
    rankOrLevel: input.rankOrLevel,
    traits: input.traits,
    description: input.description,
    traditions: input.traditions,
    castOrActivate: input.castOrActivate,
    rangeAreaTargets: input.rangeAreaTargets,
    defense: input.defense,
    frequencyTriggerEffect: input.frequencyTriggerEffect,
    usageBulk: input.usageBulk,
    priceGp: input.priceGp ?? null,
    sourcePriceEvidence: null,
    passiveEffects: input.passiveEffects,
    grantedActions: input.grantedActions,
    computedValues: input.computedValues,
    boldTokens: input.boldTokens,
  };
}

export async function generatePdf(cards: CardInput[], outputPath: string): Promise<void> {
  const css = readFileSync(STYLES_PATH, "utf-8");

  const batch: BatchItem[] = cards.map((input, index) => {
    const parsed = normalizeParsedCard(cardInputToParseCard(input));
    const plannedCards = splitParsedCard(parsed);
    return {
      id: `card-${index}`,
      card: parsed,
      quantity: Math.max(1, input.quantity),
      warnings: [],
      plannedCards,
      sourceText: "",
      addedAt: new Date().toISOString(),
    };
  });

  const pages = packPrintPages(batch);

  const pagesHtml = pages
    .map((page) => {
      const cardSlots = page
        .map((instance) =>
          `<div class="page-card">${renderToStaticMarkup(createElement(CardFace, { card: instance.card, compact: true }))}</div>`
        )
        .join("\n");
      return `<section class="a4-page"><div class="page-grid">${cardSlots}</div></section>`;
    })
    .join("\n");

  const html = buildHtmlDocument(pagesHtml, css);

  mkdirSync(dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env["PLAYWRIGHT_CHROMIUM_PATH"] ?? "/opt/pw-browsers/chromium",
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}
