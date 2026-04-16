import { useId } from "react";
import { DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MODEL } from "../../constants";
import { useAppStore } from "../../store";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppStore();
  const apiKeyId = useId();
  const persistId = useId();
  const modelId = useId();
  const thresholdId = useId();

  return (
    <div className="settings-popover">
      <div className="settings-header">
        <strong>Settings</strong>
        <button className="settings-close" onClick={onClose} type="button">
          &times;
        </button>
      </div>

      <div className="settings-body">
        <label className="field" htmlFor={apiKeyId}>
          <span>API key</span>
          <input
            id={apiKeyId}
            onChange={(event) =>
              dispatch({
                type: "update-settings",
                patch: { apiKey: event.target.value },
              })
            }
            placeholder="sk-or-v1-..."
            type="password"
            value={state.settings.apiKey}
          />
        </label>

        <label className="checkbox-field" htmlFor={persistId}>
          <input
            checked={state.settings.persistApiKey}
            id={persistId}
            onChange={(event) =>
              dispatch({
                type: "update-settings",
                patch: { persistApiKey: event.target.checked },
              })
            }
            type="checkbox"
          />
          <span>Store API key in local storage</span>
        </label>

        <div className="settings-grid">
          <label className="field" htmlFor={modelId}>
            <span>Model</span>
            <input
              id={modelId}
              onChange={(event) =>
                dispatch({
                  type: "update-settings",
                  patch: { selectedModel: event.target.value || DEFAULT_MODEL },
                })
              }
              value={state.settings.selectedModel}
            />
          </label>

          <label className="field" htmlFor={thresholdId}>
            <span>Confidence threshold</span>
            <input
              id={thresholdId}
              max={1}
              min={0}
              onChange={(event) =>
                dispatch({
                  type: "update-settings",
                  patch: {
                    confidenceThreshold: Number(event.target.value) || DEFAULT_CONFIDENCE_THRESHOLD,
                  },
                })
              }
              step={0.01}
              type="number"
              value={state.settings.confidenceThreshold}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
