import { useState } from "react";
import InputWorkspace from "./features/draft/InputWorkspace";
import PagePreview from "./features/page/PagePreview";
import SettingsPanel from "./features/settings/SettingsPanel";
import { OpenRouterParserClient } from "./lib/parser/openRouter";
import { useAppStore, AppStoreProvider } from "./store";
import type { ParserClient } from "./types";

function AppShell({ parser }: { parser: ParserClient }) {
  const { state } = useAppStore();
  const [showSettings, setShowSettings] = useState(!state.settings.apiKey);

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">PF2E Cards</span>
        <button
          className="settings-toggle"
          onClick={() => setShowSettings((prev) => !prev)}
          type="button"
        >
          Settings
        </button>
      </header>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      <main className="split-pane">
        <div className="input-panel">
          <InputWorkspace parser={parser} />
        </div>
        <div className="page-panel">
          <PagePreview />
        </div>
      </main>
    </div>
  );
}

export default function App({ parser = new OpenRouterParserClient() }: { parser?: ParserClient }) {
  return (
    <AppStoreProvider>
      <AppShell parser={parser} />
    </AppStoreProvider>
  );
}
