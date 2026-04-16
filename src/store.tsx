import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type PropsWithChildren,
} from "react";
import { EMPTY_DRAFT, INITIAL_STATE } from "./constants";
import { debugLog } from "./lib/debug";
import { canAddDraftToBatch } from "./lib/parser/normalize";
import { splitParsedCard } from "./lib/printing/split";
import { loadPersistedState, savePersistedState } from "./lib/storage/localStorage";
import type { AppSettings, AppState, BatchItem, CardDraft } from "./types";

type Action =
  | { type: "update-settings"; patch: Partial<AppSettings> }
  | { type: "update-source"; sourceText: string }
  | { type: "set-draft-quantity"; quantity: number }
  | { type: "set-draft-option"; selectedOptionId?: string }
  | { type: "start-parse" }
  | { type: "parse-success"; draft: CardDraft }
  | { type: "parse-error"; message: string }
  | { type: "reset-draft"; keepSource?: boolean }
  | { type: "add-batch-item" }
  | { type: "set-batch-quantity"; itemId: string; quantity: number }
  | { type: "duplicate-batch-item"; itemId: string }
  | { type: "remove-batch-item"; itemId: string };

interface AppStoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

function generateId() {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createBatchItem(draft: CardDraft): BatchItem {
  const plannedCards = splitParsedCard(draft.parsed!);
  const id = generateId();
  return {
    id,
    card: draft.parsed!,
    quantity: Math.max(1, draft.quantity),
    warnings: draft.confirmWarnings,
    plannedCards,
    sourceText: draft.sourceText,
    selectedOptionId: draft.selectedOptionId,
    addedAt: new Date().toISOString(),
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "update-settings":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.patch,
        },
      };
    case "update-source":
      return {
        ...state,
        draft: {
          ...EMPTY_DRAFT,
          sourceText: action.sourceText,
          quantity: state.draft.quantity,
        },
      };
    case "set-draft-quantity":
      return {
        ...state,
        draft: {
          ...state.draft,
          quantity: Math.max(1, action.quantity),
        },
      };
    case "set-draft-option":
      return {
        ...state,
        draft: {
          ...state.draft,
          selectedOptionId: action.selectedOptionId,
        },
      };
    case "start-parse":
      return {
        ...state,
        draft: {
          ...state.draft,
          status: "parsing",
          errorMessage: undefined,
        },
      };
    case "parse-success":
      return {
        ...state,
        draft: {
          ...action.draft,
          quantity: state.draft.quantity,
        },
      };
    case "parse-error":
      return {
        ...state,
        draft: {
          ...state.draft,
          status: "error",
          errorMessage: action.message,
        },
      };
    case "reset-draft":
      return {
        ...state,
        draft: action.keepSource
          ? {
              ...EMPTY_DRAFT,
              sourceText: state.draft.sourceText,
            }
          : EMPTY_DRAFT,
      };
    case "add-batch-item": {
      if (!canAddDraftToBatch(state.draft)) {
        return state;
      }

      return {
        ...state,
        batch: [...state.batch, createBatchItem(state.draft)],
        draft: {
          ...EMPTY_DRAFT,
          sourceText: "",
        },
      };
    }
    case "set-batch-quantity":
      return {
        ...state,
        batch: state.batch.map((item) =>
          item.id === action.itemId
            ? {
                ...item,
                quantity: Math.max(1, action.quantity),
              }
            : item,
        ),
      };
    case "duplicate-batch-item": {
      const target = state.batch.find((item) => item.id === action.itemId);
      if (!target) {
        return state;
      }

      return {
        ...state,
        batch: [
          ...state.batch,
          {
            ...target,
            id: generateId(),
            addedAt: new Date().toISOString(),
          },
        ],
      };
    }
    case "remove-batch-item":
      return {
        ...state,
        batch: state.batch.filter((item) => item.id !== action.itemId),
      };
    default:
      return state;
  }
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const persisted = loadPersistedState();
  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    ...persisted,
  });
  const previousSummaryRef = useRef<string | null>(null);

  useEffect(() => {
    debugLog("store", "Loaded persisted state", {
      batchSize: state.batch.length,
      draftStatus: state.draft.status,
      persistApiKey: state.settings.persistApiKey,
    });
  }, []);

  useEffect(() => {
    savePersistedState(state);
    const summary = {
      batchSize: state.batch.length,
      draftStatus: state.draft.status,
      draftName: state.draft.parsed?.name ?? null,
    };
    const serialized = JSON.stringify(summary);
    if (previousSummaryRef.current !== serialized) {
      previousSummaryRef.current = serialized;
      debugLog("store", "Persisted state snapshot", summary);
    }
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
    }),
    [state],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider.");
  }

  return context;
}
