import { Fragment, type ReactNode } from "react";
import ActionGlyph, { getActionCost } from "./ActionGlyph";
import { highlightMechanicalText } from "../lib/formatting";
import type { CardFact, CardSection, SplitCard } from "../types";

const SHORT_LABEL: Record<string, string> = {
  "Cast / Activate": "Cast",
  "Range / Area / Targets": "Range",
  Defense: "Defense",
  "Usage / Bulk": "Usage",
  "Frequency / Trigger / Effect": "Freq",
  Price: "Price",
  Traditions: "Traditions",
};

const LADDER_LABELS = ["Critical Success", "Critical Failure", "Success", "Failure"] as const;
type LadderLabel = (typeof LADDER_LABELS)[number];

const LADDER_DISPLAY: Record<LadderLabel, string> = {
  "Critical Success": "Crit. Success",
  "Critical Failure": "Crit. Failure",
  Success: "Success",
  Failure: "Failure",
};

function matchLadder(paragraph: string): { label: LadderLabel; rest: string } | null {
  const trimmed = paragraph.trim();
  for (const label of LADDER_LABELS) {
    if (trimmed === label) {
      return { label, rest: "" };
    }
    if (trimmed.startsWith(`${label} `) || trimmed.startsWith(`${label}\n`)) {
      return { label, rest: trimmed.slice(label.length).trim() };
    }
  }
  return null;
}

function matchHeightened(paragraph: string): { leader: string; rest: string } | null {
  const trimmed = paragraph.trim();
  const match = /^(Heightened(?:\s*\([^)]+\))?)(?:[:.\s]+)(.*)$/s.exec(trimmed);
  if (!match) return null;
  return { leader: match[1], rest: match[2].trim() };
}

function isSavingThrowLine(paragraph: string) {
  return /^(Saving Throw|Save)\b/i.test(paragraph.trim());
}

type ProseBlock =
  | { kind: "flavor"; text: string }
  | { kind: "heightened"; leader: string; rest: string }
  | { kind: "ladder"; entries: Array<{ label: LadderLabel; rest: string }> };

function classifyProse(text: string, { hasDefense }: { hasDefense: boolean }): ProseBlock[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const blocks: ProseBlock[] = [];
  let ladder: Array<{ label: LadderLabel; rest: string }> = [];

  const flushLadder = () => {
    if (ladder.length > 0) {
      blocks.push({ kind: "ladder", entries: ladder });
      ladder = [];
    }
  };

  for (const paragraph of paragraphs) {
    if (hasDefense && isSavingThrowLine(paragraph)) {
      continue;
    }

    const ladderHit = matchLadder(paragraph);
    if (ladderHit) {
      ladder.push(ladderHit);
      continue;
    }

    flushLadder();

    const heightenedHit = matchHeightened(paragraph);
    if (heightenedHit) {
      blocks.push({ kind: "heightened", leader: heightenedHit.leader, rest: heightenedHit.rest });
      continue;
    }

    blocks.push({ kind: "flavor", text: paragraph });
  }

  flushLadder();
  return blocks;
}

function renderProseSection(section: CardSection, boldTokens: string[] | undefined, hasDefense: boolean): ReactNode {
  const text = Array.isArray(section.content) ? section.content.join("\n\n") : section.content;
  const blocks = classifyProse(text, { hasDefense });

  return (
    <div className="card-prose">
      {blocks.map((block, index) => {
        if (block.kind === "flavor") {
          return (
            <p className="card-prose-flavor" key={`flavor-${index}`}>
              {highlightMechanicalText(block.text, boldTokens)}
            </p>
          );
        }

        if (block.kind === "heightened") {
          return (
            <p className="card-prose-heightened" key={`heightened-${index}`}>
              <strong>{block.leader}</strong> {highlightMechanicalText(block.rest, boldTokens)}
            </p>
          );
        }

        return (
          <dl className="card-ladder" key={`ladder-${index}`}>
            {block.entries.map((entry, entryIndex) => (
              <Fragment key={`${entry.label}-${entryIndex}`}>
                <dt>{LADDER_DISPLAY[entry.label]}</dt>
                <dd>{highlightMechanicalText(entry.rest, boldTokens)}</dd>
              </Fragment>
            ))}
          </dl>
        );
      })}
    </div>
  );
}

function renderHighlightSection(section: CardSection, boldTokens: string[] | undefined): ReactNode {
  const entries = Array.isArray(section.content) ? section.content : [section.content];
  if (entries.length === 1) {
    return (
      <p className="card-highlight-text">{highlightMechanicalText(entries[0], boldTokens)}</p>
    );
  }
  return (
    <ul className="card-highlight-list">
      {entries.map((entry, index) => (
        <li key={`${section.label}-${index}`}>{highlightMechanicalText(entry, boldTokens)}</li>
      ))}
    </ul>
  );
}

function findFact(facts: CardFact[], label: string): CardFact | undefined {
  return facts.find((fact) => fact.label === label);
}

export default function CardFace({ card, compact = false }: { card: SplitCard; compact?: boolean }) {
  const traits = card.traits ?? [];
  const summaryFacts = card.summaryFacts ?? [];
  const sections = card.sections ?? [];
  const partIndex = card.partIndex ?? 1;
  const partTotal = card.partTotal ?? 1;
  const partLabel = partTotal > 1 ? `${partIndex}/${partTotal}` : "Single";

  const castFact = findFact(summaryFacts, "Cast / Activate");
  const traditionsFact = findFact(summaryFacts, "Traditions");
  const priceFact = findFact(summaryFacts, "Price");
  const actionCost = getActionCost(castFact?.value);
  const hasDefense = Boolean(findFact(summaryFacts, "Defense"));

  const inlineFacts = summaryFacts.filter((fact) => {
    if (fact.label === "Traditions") return false;
    if (fact.label === "Price") return false;
    if (fact.label === "Cast / Activate" && actionCost) return false;
    return true;
  });

  return (
    <article
      className={`card-face kind-${card.kind}${compact ? " compact" : ""}`}
      data-part-index={partIndex}
      data-part-total={partTotal}
    >
      <header className="card-face-header">
        <div className="card-eyebrow">
          <span className="card-kind-badge">{card.kind.toUpperCase()}</span>
          <span className="card-rank-dot" aria-hidden="true">
            ·
          </span>
          <span className="card-rank">{card.rankOrLevel}</span>
          {partTotal > 1 ? <span className="card-part-indicator">{partLabel}</span> : null}
          <span className="card-eyebrow-spacer" />
          {actionCost ? (
            <ActionGlyph value={castFact?.value} />
          ) : castFact ? (
            <span className="card-cast-text">{castFact.value}</span>
          ) : null}
        </div>

        <h3 className="card-title">{card.title}</h3>
        <span className="card-title-rule" aria-hidden="true" />

        {traits.length > 0 ? (
          <p className="card-traits">
            {traits.map((trait, index) => (
              <span key={trait} className="card-trait">
                {trait.toLowerCase()}
                {index < traits.length - 1 ? <span className="card-trait-sep"> · </span> : null}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {inlineFacts.length > 0 || priceFact ? (
        <div className="card-stats">
          {inlineFacts.map((fact) => (
            <span className="card-stat" key={`${fact.label}-${fact.value}`}>
              <span className="card-stat-label">{SHORT_LABEL[fact.label] ?? fact.label}</span>
              <span className="card-stat-value">{highlightMechanicalText(fact.value, card.boldTokens)}</span>
            </span>
          ))}
          {priceFact ? (
            <span className="card-stat card-stat-price">
              <span className="card-stat-label">Price</span>
              <span className="card-stat-value">{priceFact.value}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="card-body">
        {sections.map((section, index) => (
          <section
            className={`card-section card-section-${section.group}`}
            key={`${section.label}-${index}`}
          >
            {section.group === "highlight" ? (
              <>
                <h4 className="card-section-label">{section.label}</h4>
                {renderHighlightSection(section, card.boldTokens)}
              </>
            ) : (
              renderProseSection(section, card.boldTokens, hasDefense)
            )}
          </section>
        ))}
      </div>

      {traditionsFact ? (
        <footer className="card-footer">
          <span className="card-footer-rule" aria-hidden="true" />
          <span className="card-footer-text">
            {traditionsFact.value
              .split(/,\s*/)
              .map((t) => t.trim())
              .filter(Boolean)
              .join(" · ")}
          </span>
        </footer>
      ) : null}
    </article>
  );
}
