import CardFace from "../../components/CardFace";
import { packPrintPages } from "../../lib/printing/pack";
import { useAppStore } from "../../store";

export default function PrintPreviewView() {
  const { state } = useAppStore();
  const pages = packPrintPages(state.batch);

  if (state.batch.length === 0) {
    return (
      <section className="panel empty-state">
        <h2>Print Preview</h2>
        <p>Add cards to the batch before generating an A4 preview.</p>
      </section>
    );
  }

  return (
    <section className="print-preview">
      <div className="panel print-toolbar no-print">
        <div className="panel-heading">
          <h2>Print Preview</h2>
          <p>
            {pages.length} A4 page{pages.length === 1 ? "" : "s"} · {state.batch.length} batch item
            {state.batch.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="action-row">
          <button onClick={() => window.print()} type="button">
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="page-stack">
        {pages.map((page, pageIndex) => (
          <section className="print-page" key={`page-${pageIndex}`}>
            <header className="print-page-header no-print">A4 Page {pageIndex + 1}</header>
            <div className="print-grid">
              {page.map((instance) => (
                <CardFace card={instance.card} compact key={instance.instanceId} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
