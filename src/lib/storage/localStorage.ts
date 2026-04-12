import { INITIAL_STATE, STORAGE_KEY } from "../../constants";
import type { AppState, PersistedState } from "../../types";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
      batch: parsed.batch ?? [],
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
