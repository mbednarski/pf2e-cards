import { useMemo, useState } from "react";
import CardFace from "../../components/CardFace";
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

export default function DraftView({ parser }: { parser: ParserClient }) {
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

  function handleAddToBatch() {
    debugLog("draft", "Attempting to add current draft to batch", {
      canAdd,
      hardBlocks: state.draft.hardBlocks,
      confirmWarnings: state.draft.confirmWarnings,
      confirmed: state.draft.confirmed,
      quantity: state.draft.quantity,
      name: state.draft.parsed?.name ?? null,
    });
    dispatch({ type: "add-batch-item" });
  }

  return (
    <div className="draft-layout">
      <section className="panel">
        <div className="panel-heading">
          <h2>Add Card</h2>
          <p>Paste one AoN block, parse it, confirm any ambiguity, then add it to the batch.</p>
        </div>

        <label className="field">
          <span>AoN source text</span>
          <textarea
            onChange={(event) => dispatch({ type: "update-source", sourceText: event.target.value })}
            placeholder="Paste a single Archives of Nethys entry here..."
            rows={14}
            value={state.draft.sourceText}
          />
        </label>

        <div className="action-row">
          <button
            disabled={!canParse || state.draft.status === "parsing"}
            onClick={() =>
              parseSource(
                parser,
                state.draft.sourceText,
                state.settings.apiKey,
                state.settings.selectedModel,
                state.settings.confidenceThreshold,
                dispatch,
                selectedOption,
                state.draft.quantity,
              )
            }
            type="button"
          >
            {state.draft.status === "parsing" ? "Parsing..." : "Parse"}
          </button>

          <button onClick={() => dispatch({ type: "reset-draft" })} type="button">
            Clear
          </button>
        </div>

        {!state.settings.apiKey ? (
          <p className="inline-message warning">Enter an OpenRouter API key before parsing.</p>
        ) : null}

        {state.draft.errorMessage ? <p className="inline-message error">{state.draft.errorMessage}</p> : null}

        {state.draft.selectableOptions.length > 0 ? (
          <div className="option-row">
            <label className="field">
              <span>Target rank / variant</span>
              <select
                onChange={async (event) => {
                  const nextOptionId = event.target.value || undefined;
                  dispatch({ type: "set-draft-option", selectedOptionId: nextOptionId });

                  if (!nextOptionId) {
                    return;
                  }

                  const nextOption = state.draft.selectableOptions.find((option) => option.id === nextOptionId);
                  if (!nextOption) {
                    return;
                  }

                  debugLog("draft", "Reparsing for selected option", nextOption);
                  setIsReparsing(true);
                  await parseSource(
                    parser,
                    state.draft.sourceText,
                    state.settings.apiKey,
                    state.settings.selectedModel,
                    state.settings.confidenceThreshold,
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

            {isReparsing ? <p className="muted">Refreshing preview for the selected option...</p> : null}
          </div>
        ) : null}

        {state.draft.hardBlocks.length > 0 ? (
          <ul className="message-list error">
            {state.draft.hardBlocks.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        {state.draft.confirmWarnings.length > 0 ? (
          <>
            <ul className="message-list warning">
              {state.draft.confirmWarnings.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>

            <label className="checkbox-field">
              <input
                checked={state.draft.confirmed}
                onChange={(event) =>
                  dispatch({
                    type: "set-draft-confirmed",
                    confirmed: event.target.checked,
                  })
                }
                type="checkbox"
              />
              <span>I reviewed the warnings and want to add this card anyway.</span>
            </label>
          </>
        ) : null}

        <div className="action-row">
          <label className="field inline-field">
            <span>Quantity</span>
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

          <button disabled={!canAdd} onClick={handleAddToBatch} type="button">
            Add to Batch
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Review Preview</h2>
          <p>
            {previewCards.length > 0
              ? `${previewCards.length} planned print card${previewCards.length === 1 ? "" : "s"} from the current parse.`
              : "Parsed cards will appear here."}
          </p>
        </div>

        {state.draft.parsed ? (
          <>
            <div className="preview-summary">
              <div>
                <strong>{state.draft.parsed.name}</strong>
                <p className="muted">
                  {state.draft.parsed.kind} · {state.draft.parsed.rankOrLevel}
                </p>
              </div>
              <div className="stat-pill">Confidence {state.draft.confidence.toFixed(2)}</div>
            </div>

            <div className="preview-card-grid">
              {previewCards.map((card) => (
                <CardFace card={card} key={card.id} />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state embedded">
            <p>Parse a card to review the normalized output and continuation cards here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
