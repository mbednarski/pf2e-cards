import { INITIAL_STATE, STORAGE_KEY } from "../../constants";
import type { AppState, BatchItem, PersistedState } from "../../types";
import { debugLog } from "../debug";
import { splitParsedCard } from "../printing/split";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function rehydrateBatch(batch: unknown): BatchItem[] {
  if (!Array.isArray(batch)) {
    debugLog("storage", "Rehydrated persisted batch", { in: 0, out: 0, reason: "not-array" });
    return [];
  }

  const items = batch.flatMap((raw) => {
    if (!raw || typeof raw !== "object") {
      return [];
    }

    const item = raw as Partial<BatchItem>;
    if (!item.card || !item.id) {
      return [];
    }

    try {
      return [
        {
          ...(item as BatchItem),
          plannedCards: splitParsedCard(item.card),
        },
      ];
    } catch {
      return [];
    }
  });

  debugLog("storage", "Rehydrated persisted batch", { in: batch.length, out: items.length });
  return items;
}

function sanitizePersistedState(state: PersistedState): PersistedState {
  const nextDraft =
    state.draft.status === "parsing"
      ? {
          ...state.draft,
          status: "idle" as const,
          errorMessage: undefined,
        }
      : state.draft;

  return {
    settings: state.settings.persistApiKey
      ? state.settings
      : {
          ...state.settings,
          apiKey: "",
        },
    draft: nextDraft,
    batch: state.batch,
  };
}

export function loadPersistedState(): PersistedState {
  if (!isBrowser()) {
    return INITIAL_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_STATE;
    }

    const parsed = JSON.parse(raw) as PersistedState;
    return sanitizePersistedState({
      ...INITIAL_STATE,
      ...parsed,
      settings: {
        ...INITIAL_STATE.settings,
        ...parsed.settings,
      },
      draft: {
        ...INITIAL_STATE.draft,
        ...parsed.draft,
      },
      batch: rehydrateBatch(parsed.batch),
    });
  } catch {
    return INITIAL_STATE;
  }
}

export function savePersistedState(state: AppState) {
  if (!isBrowser()) {
    return;
  }

  const persistable: PersistedState = {
    settings: state.settings.persistApiKey
      ? state.settings
      : {
          ...state.settings,
          apiKey: "",
        },
    draft: state.draft,
    batch: state.batch,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
}
