import Navigation from "./components/Navigation";
import BatchView from "./features/batch/BatchView";
import DraftView from "./features/draft/DraftView";
import PrintPreviewView from "./features/print/PrintPreviewView";
import SettingsPanel from "./features/settings/SettingsPanel";
import { OpenRouterParserClient } from "./lib/parser/openRouter";
import { useAppStore, AppStoreProvider } from "./store";
import type { ParserClient } from "./types";

function AppShell({ parser }: { parser: ParserClient }) {
  const { state, dispatch } = useAppStore();

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">PF2E Printable Cards</p>
          <h1>Turn AoN text into printable tabletop cards.</h1>
          <p className="hero-copy">
            Local-first parsing, confirmation-based review, quantity batching, and A4-ready print
            preview in one browser app.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span>Batch items</span>
            <strong>{state.batch.length}</strong>
          </div>
          <div className="stat-card">
            <span>Model</span>
            <strong>{state.settings.selectedModel}</strong>
          </div>
        </div>
      </header>

      <Navigation currentView={state.currentView} onNavigate={(view) => dispatch({ type: "set-view", view })} />

      <main className="app-grid">
        <aside className="sidebar">
          <SettingsPanel />
        </aside>

        <section className="content">
          {state.currentView === "add" ? <DraftView parser={parser} /> : null}
          {state.currentView === "batch" ? <BatchView /> : null}
          {state.currentView === "print" ? <PrintPreviewView /> : null}
        </section>
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
