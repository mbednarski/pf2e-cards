import type { ReactElement } from "react";

export type ActionCost = "one-action" | "two-actions" | "three-actions" | "reaction" | "free-action";

function normalize(value: string | null | undefined): ActionCost | null {
  if (!value) return null;
  const v = value.toLowerCase().replace(/[_\s]+/g, "-").trim();

  // Check for bracketed notation like [one-action] anywhere in the text
  const bracketMatch = v.match(/\[(one-action|two-actions|three-actions|reaction|free-action)\]/);
  if (bracketMatch) return bracketMatch[1] as ActionCost;

  if (v.startsWith("three")) return "three-actions";
  if (v.startsWith("two")) return "two-actions";
  if (v.startsWith("one")) return "one-action";
  if (v.includes("reaction")) return "reaction";
  if (v.includes("free")) return "free-action";
  if (v === "1") return "one-action";
  if (v === "2") return "two-actions";
  if (v === "3") return "three-actions";
  return null;
}

function Diamond({ cx, cy }: { cx: number; cy: number }) {
  const r = 4.4;
  return (
    <path
      d={`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  );
}

function OneAction() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" className="action-glyph-svg">
      <Diamond cx={7} cy={7} />
    </svg>
  );
}

function TwoActions() {
  return (
    <svg viewBox="0 0 26 14" aria-hidden="true" className="action-glyph-svg">
      <Diamond cx={6} cy={7} />
      <Diamond cx={19} cy={7} />
    </svg>
  );
}

function ThreeActions() {
  return (
    <svg viewBox="0 0 38 14" aria-hidden="true" className="action-glyph-svg">
      <Diamond cx={6} cy={7} />
      <Diamond cx={19} cy={7} />
      <Diamond cx={32} cy={7} />
    </svg>
  );
}

function Reaction() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" className="action-glyph-svg">
      <path
        d="M 9 2.5 A 4.6 4.6 0 1 1 5 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M 6.5 1 L 5 2.5 L 6.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FreeAction() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" className="action-glyph-svg">
      <circle cx={7} cy={7} r={4.4} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const GLYPHS: Record<ActionCost, () => ReactElement> = {
  "one-action": OneAction,
  "two-actions": TwoActions,
  "three-actions": ThreeActions,
  reaction: Reaction,
  "free-action": FreeAction,
};

const LABELS: Record<ActionCost, string> = {
  "one-action": "1 action",
  "two-actions": "2 actions",
  "three-actions": "3 actions",
  reaction: "reaction",
  "free-action": "free action",
};

export default function ActionGlyph({ value }: { value: string | null | undefined }) {
  const kind = normalize(value);
  if (!kind) return null;
  const Glyph = GLYPHS[kind];
  return (
    <span className={`action-glyph action-glyph-${kind}`} role="img" aria-label={LABELS[kind]}>
      <Glyph />
    </span>
  );
}

export function getActionCost(value: string | null | undefined): ActionCost | null {
  return normalize(value);
}
