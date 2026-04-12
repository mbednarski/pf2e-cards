import type { ViewName } from "../types";

const VIEWS: Array<{ id: ViewName; label: string }> = [
  { id: "add", label: "Add Card" },
  { id: "batch", label: "Batch" },
  { id: "print", label: "Print Preview" },
];

export default function Navigation({
  currentView,
  onNavigate,
}: {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
}) {
  return (
    <nav className="main-nav" aria-label="Main">
      {VIEWS.map((view) => (
        <button
          className={view.id === currentView ? "active" : ""}
          key={view.id}
          onClick={() => onNavigate(view.id)}
          type="button"
        >
          {view.label}
        </button>
      ))}
    </nav>
  );
}
