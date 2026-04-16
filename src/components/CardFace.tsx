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

const VALUE_PREFIX_STRIPPERS: Record<string, RegExp> = {
  "Range / Area / Targets": /^(Range|Area|Targets)\s+/i,
  "Usage / Bulk": /^Usage\s+/i,
  "Frequency / Trigger / Effect": /^Frequency\s+/i,
  Defense: /^Defense\s+/i,
};

function stripLabelPrefix(label: string, value: string): string {
  const pattern = VALUE_PREFIX_STRIPPERS[label];
  if (!pattern) return value;
  return value.replace(pattern, "").trim();
}

function stripBulk(value: string): string {
  return value.replace(/;?\s*Bulk\b.*/i, "").trim();
}

function formatPrice(value: string): string {
  if (/gp/i.test(value)) return value.replace(/\s+gp/i, "gp");
  const num = value.trim();
  if (/^\d[\d,]*$/.test(num)) return `${num}gp`;
  return value;
}

const LADDER_LABELS = ["Critical Success", "Critical Failure", "Success", "Failure"] as const;
type LadderLabel = (typeof LADDER_LABELS)[number];
type LadderEntry = { label: LadderLabel; rest: string };

const LADDER_DISPLAY: Record<LadderLabel, string> = {
  "Critical Success": "Crit. Success",
  "Critical Failure": "Crit. Failure",
  Success: "Success",
  Failure: "Failure",
};

const LADDER_PATTERN = /\b(Critical Success|Critical Failure|Success|Failure)\b/g;

function cleanRest(text: string): string {
  return text.trim().replace(/^[:.\s]+/, "").replace(/[\s]+$/, "");
}

function extractLadder(text: string): { prefix: string; entries: LadderEntry[] } | null {
  const hits: Array<{ label: LadderLabel; start: number; end: number }> = [];
  LADDER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LADDER_PATTERN.exec(text)) !== null) {
    hits.push({
      label: match[1] as LadderLabel,
      start: match.index,
      end: match.index + match[1].length,
    });
  }
  if (hits.length === 0) return null;

  const prefix = text.slice(0, hits[0].start).trim().replace(/[\s.]+$/, "");
  const entries: LadderEntry[] = hits.map((hit, i) => {
    const startContent = hit.end;
    const endContent = i + 1 < hits.length ? hits[i + 1].start : text.length;
    return { label: hit.label, rest: cleanRest(text.slice(startContent, endContent)) };
  });

  return { prefix, entries };
}

function isHeightenedLine(paragraph: string) {
  return /^Heightened\b/i.test(paragraph.trim());
}

function isSavingThrowLine(paragraph: string) {
  return /^(Saving Throw|Save)\b/i.test(paragraph.trim());
}

function splitAtHeightened(paragraph: string): string[] {
  if (/^Heightened\b/i.test(paragraph)) return [paragraph];
  const match = /\bHeightened\b/i.exec(paragraph);
  if (!match) return [paragraph];
  return [
    paragraph.slice(0, match.index).trim(),
    paragraph.slice(match.index).trim(),
  ].filter(Boolean);
}

type ProseBlock =
  | { kind: "flavor"; text: string }
  | { kind: "ladder"; entries: LadderEntry[] };

function classifyProse(text: string, { hasDefense }: { hasDefense: boolean }): ProseBlock[] {
  const paragraphs = text
    .split(/\n+/)
    .flatMap(splitAtHeightened)
    .map((p) => p.trim())
    .filter(Boolean);
  const blocks: ProseBlock[] = [];
  let ladderRun: LadderEntry[] = [];

  const flushLadder = () => {
    if (ladderRun.length > 0) {
      blocks.push({ kind: "ladder", entries: ladderRun });
      ladderRun = [];
    }
  };

  for (const paragraph of paragraphs) {
    if (isHeightenedLine(paragraph)) continue;
    if (hasDefense && isSavingThrowLine(paragraph)) continue;

    const ladder = extractLadder(paragraph);

    if (ladder && ladder.entries.length >= 2) {
      if (ladder.prefix && !isSavingThrowLine(ladder.prefix) && !isHeightenedLine(ladder.prefix)) {
        flushLadder();
        blocks.push({ kind: "flavor", text: ladder.prefix });
      }
      ladderRun.push(...ladder.entries);
      continue;
    }

    if (ladder && ladder.entries.length === 1 && ladder.prefix === "") {
      ladderRun.push(ladder.entries[0]);
      continue;
    }

    flushLadder();
    blocks.push({ kind: "flavor", text: paragraph });
  }

  flushLadder();
  return blocks;
}

function renderProseSection(section: CardSection, boldTokens: string[] | undefined, hasDefense: boolean): ReactNode {
  const text = Array.isArray(section.content) ? section.content.join("\n\n") : section.content;
  const blocks = classifyProse(text, { hasDefense });

  if (blocks.length === 0) return null;

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
  const partLabel = partTotal > 1 ? `${partIndex}/${partTotal}` : null;

  const castFact = findFact(summaryFacts, "Cast / Activate");
  const traditionsFact = findFact(summaryFacts, "Traditions");
  const priceFact = findFact(summaryFacts, "Price");
  const actionCost = getActionCost(castFact?.value);
  const hasDefense = Boolean(findFact(summaryFacts, "Defense"));

  const inlineFacts = summaryFacts
    .filter((fact) => {
      if (fact.label === "Traditions") return false;
      if (fact.label === "Price") return false;
      if (fact.label === "Cast / Activate" && actionCost) return false;
      return true;
    })
    .map((fact) =>
      fact.label === "Usage / Bulk" ? { ...fact, value: stripBulk(fact.value) } : fact,
    )
    .filter((fact) => fact.value.trim() !== "");

  return (
    <article
      className={`card-face kind-${card.kind}${compact ? " compact" : ""}`}
      data-part-index={partIndex}
      data-part-total={partTotal}
    >
      <header className="card-face-header">
        <div className="card-header-row">
          <h3 className="card-title">{card.title}</h3>
          <div className="card-meta-cluster">
            {actionCost ? (
              <ActionGlyph value={castFact?.value} />
            ) : castFact ? (
              <span className="card-cast-text">{castFact.value}</span>
            ) : null}
          </div>
        </div>
        <span className="card-title-rule" aria-hidden="true" />

        {traits.length > 0 ? (
          <div className="card-traits">
            {traits.map((trait) => (
              <span key={trait} className="card-trait">
                {trait}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {inlineFacts.length > 0 ? (
        <div className="card-stats">
          {inlineFacts.map((fact) => {
            const displayValue = stripLabelPrefix(fact.label, fact.value);
            return (
              <span className="card-stat" key={`${fact.label}-${fact.value}`}>
                <span className="card-stat-label">{SHORT_LABEL[fact.label] ?? fact.label}</span>
                <span className="card-stat-value">
                  {highlightMechanicalText(displayValue, card.boldTokens)}
                </span>
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="card-body">
        {sections.map((section, index) => {
          const hideLabel = section.group === "highlight" && section.label === "Computed Values";
          return (
            <section
              className={`card-section card-section-${section.group}${hideLabel ? " card-section-no-label" : ""}`}
              key={`${section.label}-${index}`}
            >
              {section.group === "highlight" ? (
                <>
                  {hideLabel ? null : <h4 className="card-section-label">{section.label}</h4>}
                  {renderHighlightSection(section, card.boldTokens)}
                </>
              ) : (
                renderProseSection(section, card.boldTokens, hasDefense)
              )}
            </section>
          );
        })}
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

      <div className="card-bottom-bar">
        <span className="card-bottom-price">
          {priceFact ? formatPrice(priceFact.value) : ""}
        </span>
        <span className="card-bottom-level">
          {card.rankOrLevel}
          {partLabel ? <span className="card-part-indicator">{partLabel}</span> : null}
        </span>
      </div>
    </article>
  );
}
