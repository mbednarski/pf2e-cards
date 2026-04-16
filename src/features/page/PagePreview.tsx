import { useMemo } from "react";
import CardErrorBoundary from "../../components/CardErrorBoundary";
import CardFace from "../../components/CardFace";
import { MAX_CARDS_PER_PAGE } from "../../constants";
import { packPrintPages } from "../../lib/printing/pack";
import { useAppStore } from "../../store";

export default function PagePreview() {
  const { state, dispatch } = useAppStore();
  const pages = useMemo(() => packPrintPages(state.batch), [state.batch]);

  const totalCards = pages.reduce((sum, page) => sum + page.length, 0);

  if (state.batch.length === 0) {
    return (
      <div className="page-empty">
        <p>Cards will appear here as you add them.</p>
      </div>
    );
  }

  return (
    <div className="page-preview">
      <div className="page-toolbar">
        <span className="page-info">
          {pages.length} page{pages.length !== 1 ? "s" : ""} · {totalCards} card{totalCards !== 1 ? "s" : ""}
        </span>
        <button
          className="btn-primary"
          onClick={() => window.print()}
          type="button"
        >
          Print / Save PDF
        </button>
      </div>

      {pages.map((page, pageIndex) => (
        <section className="a4-page" key={pageIndex}>
          <h3 className="page-label no-print">Page {pageIndex + 1}</h3>
          <div className="page-grid">
            {page.map((instance) => (
              <div className="page-card" key={instance.instanceId}>
                <button
                  className="card-remove no-print"
                  onClick={() =>
                    dispatch({ type: "remove-batch-item", itemId: instance.batchItemId })
                  }
                  title="Remove card"
                  type="button"
                >
                  &times;
                </button>
                <CardErrorBoundary fallbackTitle={instance.card.title}>
                  <CardFace card={instance.card} compact />
                </CardErrorBoundary>
              </div>
            ))}

            {/* Empty slots to show remaining capacity on last page */}
            {pageIndex === pages.length - 1 &&
              page.length < MAX_CARDS_PER_PAGE &&
              Array.from({ length: MAX_CARDS_PER_PAGE - page.length }).map((_, i) => (
                <div className="page-slot" key={`empty-${i}`}>
                  <span className="slot-number">{page.length + i + 1}</span>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
