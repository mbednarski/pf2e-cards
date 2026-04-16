import { useMemo, useState } from "react";
import { debugError, debugLog } from "../../lib/debug";
import { canAddDraftToBatch, createReviewedDraft } from "../../lib/parser/normalize";
import { splitParsedCard } from "../../lib/printing/split";
import { useAppStore } from "../../store";
import type { ParserClient, SelectableOption } from "../../types";

async function parseSource(
  parser: ParserClient,
  sourceText: string,
  apiKey: string,
  model: string,
  confidenceThreshold: number,
  dispatch: ReturnType<typeof useAppStore>["dispatch"],
  selectedOption?: SelectableOption,
  quantity = 1,
) {
  dispatch({ type: "start-parse" });
  debugLog("draft", "Dispatching parse", {
    sourceLength: sourceText.length,
    model,
    confidenceThreshold,
    selectedOption: selectedOption ?? null,
    quantity,
  });

  try {
    const output = await parser.parse({
      sourceText,
      apiKey,
      model,
      selectedOption,
    });

    const reviewedDraft = createReviewedDraft(
      sourceText,
      output,
      confidenceThreshold,
      selectedOption?.id,
    );

    debugLog("draft", "Created reviewed draft", {
      inferredType: reviewedDraft.inferredType,
      hardBlocks: reviewedDraft.hardBlocks,
      confirmWarnings: reviewedDraft.confirmWarnings,
      confidence: reviewedDraft.confidence,
      selectedOptionId: reviewedDraft.selectedOptionId ?? null,
    });

    dispatch({
      type: "parse-success",
      draft: {
        ...reviewedDraft,
        quantity,
      },
    });
  } catch (error) {
    debugError("draft", "Parse flow failed", error);
    dispatch({
      type: "parse-error",
      message: error instanceof Error ? error.message : "Unexpected parse failure.",
    });
  }
}

export default function InputWorkspace({ parser }: { parser: ParserClient }) {
  const { state, dispatch } = useAppStore();
  const [isReparsing, setIsReparsing] = useState(false);
  const previewCards = useMemo(
    () => (state.draft.parsed ? splitParsedCard(state.draft.parsed) : []),
    [state.draft.parsed],
  );

  const selectedOption = state.draft.selectableOptions.find(
    (option) => option.id === state.draft.selectedOptionId,
  );
  const canParse = state.draft.sourceText.trim().length > 0 && state.settings.apiKey.trim().length > 0;
  const canAdd = canAddDraftToBatch(state.draft);

  function handleAdd() {
    debugLog("draft", "Attempting to add current draft to batch", {
      canAdd,
      hardBlocks: state.draft.hardBlocks,
      confirmWarnings: state.draft.confirmWarnings,
      quantity: state.draft.quantity,
      name: state.draft.parsed?.name ?? null,
    });
    dispatch({ type: "add-batch-item" });
  }

  const confidenceThreshold = state.settings.confidenceThreshold;
  const isLowConfidence = state.draft.status === "parsed" && state.draft.confidence < confidenceThreshold;

  return (
    <div className="workspace">
      <label className="field">
        <span>AoN source text</span>
        <textarea
          onChange={(event) => dispatch({ type: "update-source", sourceText: event.target.value })}
          placeholder="Paste an Archives of Nethys entry..."
          rows={8}
          value={state.draft.sourceText}
        />
      </label>

      <button
        className="btn-primary"
        disabled={!canParse || state.draft.status === "parsing"}
        onClick={() =>
          parseSource(
            parser,
            state.draft.sourceText,
            state.settings.apiKey,
            state.settings.selectedModel,
            confidenceThreshold,
            dispatch,
            selectedOption,
            state.draft.quantity,
          )
        }
        type="button"
      >
        {state.draft.status === "parsing" ? "Parsing..." : "Parse"}
      </button>

      {!state.settings.apiKey && (
        <p className="inline-message warning">Set an API key in Settings before parsing.</p>
      )}

      {state.draft.errorMessage && (
        <p className="inline-message error">{state.draft.errorMessage}</p>
      )}

      {state.draft.parsed && (
        <div className="parsed-preview">
          <div className="preview-header">
            <div>
              <strong className="preview-name">{state.draft.parsed.name}</strong>
              <span className="preview-meta">
                {state.draft.parsed.kind} · {state.draft.parsed.rankOrLevel}
                {previewCards.length > 1 && ` · ${previewCards.length} cards`}
              </span>
            </div>
            {isLowConfidence && (
              <span className="badge badge-warning" title="Below confidence threshold">
                {state.draft.confidence.toFixed(2)}
              </span>
            )}
          </div>

          {state.draft.confirmWarnings.length > 0 && (
            <ul className="warning-list">
              {state.draft.confirmWarnings.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

          {state.draft.selectableOptions.length > 0 && (
            <label className="field">
              <span>Rank / variant</span>
              <select
                onChange={async (event) => {
                  const nextOptionId = event.target.value || undefined;
                  dispatch({ type: "set-draft-option", selectedOptionId: nextOptionId });

                  if (!nextOptionId) return;

                  const nextOption = state.draft.selectableOptions.find(
                    (option) => option.id === nextOptionId,
                  );
                  if (!nextOption) return;

                  debugLog("draft", "Reparsing for selected option", nextOption);
                  setIsReparsing(true);
                  await parseSource(
                    parser,
                    state.draft.sourceText,
                    state.settings.apiKey,
                    state.settings.selectedModel,
                    confidenceThreshold,
                    dispatch,
                    nextOption,
                    state.draft.quantity,
                  );
                  setIsReparsing(false);
                }}
                value={state.draft.selectedOptionId ?? ""}
              >
                <option value="">Choose one</option>
                {state.draft.selectableOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isReparsing && <p className="muted">Refreshing preview...</p>}

          {state.draft.hardBlocks.length > 0 && (
            <ul className="error-list">
              {state.draft.hardBlocks.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

          <div className="add-row">
            <label className="field qty-field">
              <span>Qty</span>
              <input
                min={1}
                onChange={(event) =>
                  dispatch({
                    type: "set-draft-quantity",
                    quantity: Number(event.target.value),
                  })
                }
                type="number"
                value={state.draft.quantity}
              />
            </label>

            <button
              className="btn-primary"
              disabled={!canAdd}
              onClick={handleAdd}
              type="button"
            >
              + Add to Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
