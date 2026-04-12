import { MAX_CARDS_PER_PAGE } from "../../constants";
import type { BatchItem, PrintCardInstance } from "../../types";

export function expandBatchToPrintCards(batch: BatchItem[]): PrintCardInstance[] {
  const expanded: PrintCardInstance[] = [];

  for (const item of batch) {
    for (let quantityIndex = 0; quantityIndex < item.quantity; quantityIndex += 1) {
      for (const card of item.plannedCards) {
        expanded.push({
          instanceId: `${item.id}:${quantityIndex + 1}:${card.id}`,
          batchItemId: item.id,
          quantityIndex: quantityIndex + 1,
          card,
        });
      }
    }
  }

  return expanded;
}

export function packPrintPages(batch: BatchItem[]) {
  const cards = expandBatchToPrintCards(batch);
  const pages: PrintCardInstance[][] = [];

  for (let index = 0; index < cards.length; index += MAX_CARDS_PER_PAGE) {
    pages.push(cards.slice(index, index + MAX_CARDS_PER_PAGE));
  }

  return pages;
}
