import { highlightMechanicalText } from "../lib/formatting";
import type { CardSection, SplitCard } from "../types";

function SectionContent({ section, boldTokens }: { section: CardSection; boldTokens?: string[] }) {
  if (Array.isArray(section.content)) {
    return (
      <ul className="card-section-list">
        {section.content.map((entry) => (
          <li key={`${section.label}-${entry}`}>{highlightMechanicalText(entry, boldTokens)}</li>
        ))}
      </ul>
    );
  }

  return <p className="card-section-text">{highlightMechanicalText(section.content, boldTokens)}</p>;
}

export default function CardFace({ card, compact = false }: { card: SplitCard; compact?: boolean }) {
  return (
    <article className={`card-face${compact ? " compact" : ""}`}>
      <header className="card-face-header">
        <div>
          <p className="eyebrow">{card.kind.toUpperCase()}</p>
          <h3>{card.title}</h3>
          <p className="card-rank">{card.rankOrLevel}</p>
        </div>
        <div className="card-part-indicator">
          <span>{card.partTotal > 1 ? `${card.partIndex}/${card.partTotal}` : "Single"}</span>
        </div>
      </header>

      {card.traits.length > 0 ? (
        <div className="trait-list">
          {card.traits.map((trait) => (
            <span className="trait-pill" key={trait}>
              {trait}
            </span>
          ))}
        </div>
      ) : null}

      <div className="card-sections">
        {card.sections.map((section, index) => (
          <section className="card-section" key={`${section.label}-${index}`}>
            <h4>{section.label}</h4>
            <SectionContent section={section} boldTokens={card.boldTokens} />
          </section>
        ))}
      </div>
    </article>
  );
}
