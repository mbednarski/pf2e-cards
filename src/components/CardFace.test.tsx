import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CardFace from "./CardFace";
import type { SplitCard } from "../types";

const slowDescription = [
  "You dilate the flow of time around the target, slowing its actions.",
  "Saving Throw Fortitude",
  "Critical Success The target is unaffected.",
  "Success The target is slowed 1 for 1 round.",
  "Failure The target is slowed 1 for 1 minute.",
  "Critical Failure The target is slowed 2 for 1 minute.",
  "Heightened (6th) You can target up to 10 creatures.",
].join("\n\n");

const card: SplitCard = {
  id: "slow-1",
  title: "Slow",
  partIndex: 1,
  partTotal: 1,
  kind: "spell",
  rankOrLevel: "Rank 3",
  traits: ["Concentrate", "Manipulate"],
  summaryFacts: [
    { label: "Cast / Activate", value: "two-actions" },
    { label: "Range / Area / Targets", value: "Range 30 feet; Targets 1 creature" },
    { label: "Defense", value: "Fortitude" },
    { label: "Traditions", value: "arcane, occult, primal" },
  ],
  boldTokens: ["slowed 1", "slowed 2"],
  sections: [
    {
      label: "Description",
      content: slowDescription,
      group: "prose",
    },
  ],
};

describe("CardFace", () => {
  it("renders eyebrow, title, and bordered trait chips", () => {
    const { container } = render(<CardFace card={card} />);

    expect(screen.getByText("SPELL")).toBeInTheDocument();
    expect(screen.getByText("Rank 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Slow" })).toBeInTheDocument();

    const traits = container.querySelector(".card-traits");
    expect(traits).not.toBeNull();
    const chips = traits!.querySelectorAll(".card-trait");
    expect(Array.from(chips).map((node) => node.textContent)).toEqual(["Concentrate", "Manipulate"]);
  });

  it("places the title, eyebrow, and action glyph in a single header row", () => {
    const { container } = render(<CardFace card={card} />);

    const row = container.querySelector(".card-header-row");
    expect(row).not.toBeNull();
    const title = row!.querySelector(".card-title");
    const cluster = row!.querySelector(".card-meta-cluster");
    expect(title).not.toBeNull();
    expect(cluster).not.toBeNull();
    expect(cluster!.querySelector(".card-eyebrow")).not.toBeNull();
    expect(cluster!.querySelector(".action-glyph")).not.toBeNull();
  });

  it("renders an action glyph for two-actions and hides the cast text", () => {
    const { container } = render(<CardFace card={card} />);

    expect(screen.getByRole("img", { name: "2 actions" })).toBeInTheDocument();
    expect(container.querySelector(".action-glyph-two-actions")).not.toBeNull();
    expect(screen.queryByText("two-actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Cast / Activate")).not.toBeInTheDocument();
  });

  it("strips the redundant Range prefix from the stat value", () => {
    const { container } = render(<CardFace card={card} />);
    const stats = container.querySelector(".card-stats")!;
    const rangeValue = stats.querySelectorAll(".card-stat-value")[0];
    expect(rangeValue.textContent).toBe("30 feet; Targets 1 creature");
  });

  it("renders the inline stat row with short labels and drops cast/traditions from it", () => {
    const { container } = render(<CardFace card={card} />);

    const stats = container.querySelector(".card-stats") as HTMLElement;
    expect(stats).not.toBeNull();
    expect(within(stats).getByText("Range")).toBeInTheDocument();
    expect(within(stats).getByText("Defense")).toBeInTheDocument();
    expect(within(stats).getByText("Fortitude")).toBeInTheDocument();
    expect(within(stats).queryByText("Traditions")).not.toBeInTheDocument();
    expect(within(stats).queryByText("Cast")).not.toBeInTheDocument();
  });

  it("renders the save ladder as a structured list and skips the duplicate saving-throw line", () => {
    const { container } = render(<CardFace card={card} />);

    const ladder = container.querySelector(".card-ladder");
    expect(ladder).not.toBeNull();
    const labels = Array.from(ladder!.querySelectorAll("dt")).map((node) => node.textContent);
    expect(labels).toEqual(["Crit. Success", "Success", "Failure", "Crit. Failure"]);

    expect(screen.queryByText(/Saving Throw/i)).not.toBeInTheDocument();
  });

  it("parses an inline save ladder when the parser emits one paragraph", () => {
    const inlineCard: SplitCard = {
      ...card,
      sections: [
        {
          label: "Description",
          content:
            "You dilate the flow of time around the target, slowing its actions. Critical Success The target is unaffected. Success The target is slowed 1 for 1 round. Failure The target is slowed 1 for 1 minute. Critical Failure The target is slowed 2 for 1 minute.",
          group: "prose",
        },
      ],
    };

    const { container } = render(<CardFace card={inlineCard} />);

    const ladder = container.querySelector(".card-ladder");
    expect(ladder).not.toBeNull();
    const labels = Array.from(ladder!.querySelectorAll("dt")).map((node) => node.textContent);
    expect(labels).toEqual(["Crit. Success", "Success", "Failure", "Crit. Failure"]);

    const flavor = container.querySelector(".card-prose-flavor");
    expect(flavor).not.toBeNull();
    expect(flavor!.textContent).toContain("You dilate the flow of time");
    expect(flavor!.textContent).not.toContain("Critical Success");
  });

  it("parses a save ladder when outcomes are separated by single newlines", () => {
    const newlineCard: SplitCard = {
      ...card,
      sections: [
        {
          label: "Description",
          content: [
            "You dilate the flow of time around the target.",
            "Critical Success The target is unaffected.",
            "Success The target is slowed 1 for 1 round.",
            "Failure The target is slowed 1 for 1 minute.",
            "Critical Failure The target is slowed 2 for 1 minute.",
          ].join("\n"),
          group: "prose",
        },
      ],
    };

    const { container } = render(<CardFace card={newlineCard} />);
    const ladder = container.querySelector(".card-ladder");
    expect(ladder).not.toBeNull();
    expect(ladder!.querySelectorAll("dt")).toHaveLength(4);
  });

  it("drops the Heightened paragraph because computed values carry the result", () => {
    const { container } = render(<CardFace card={card} />);
    expect(container.textContent).not.toMatch(/Heightened/);
  });

  it("renders computed-value content without showing the section label", () => {
    const withComputed: SplitCard = {
      ...card,
      sections: [
        {
          label: "Computed Values",
          content: ["Targets up to 10 creatures at 6th level"],
          group: "highlight",
        },
        card.sections[0],
      ],
    };

    const { container } = render(<CardFace card={withComputed} />);

    expect(container.querySelector(".card-section-no-label")).not.toBeNull();
    expect(screen.queryByText("Computed Values")).not.toBeInTheDocument();
    expect(screen.getByText(/Targets up to 10 creatures/)).toBeInTheDocument();
  });

  it("renders the flavor paragraph with italic styling", () => {
    const { container } = render(<CardFace card={card} />);

    const flavor = container.querySelector(".card-prose-flavor");
    expect(flavor).not.toBeNull();
    expect(flavor!.textContent).toContain("You dilate the flow of time");
  });

  it("renders the traditions footer from summary facts", () => {
    const { container } = render(<CardFace card={card} />);

    const footer = container.querySelector(".card-footer");
    expect(footer).not.toBeNull();
    expect(footer!.textContent).toContain("arcane");
    expect(footer!.textContent).toContain("occult");
    expect(footer!.textContent).toContain("primal");
  });

  it("highlights bold tokens inside the prose body", () => {
    render(<CardFace card={card} />);

    const slowed1 = screen.getAllByText("slowed 1");
    expect(slowed1.some((node) => node.tagName === "STRONG")).toBe(true);
  });

  it("omits the part indicator on single-part cards", () => {
    const { container } = render(<CardFace card={card} />);

    expect(container.querySelector(".card-part-indicator")).toBeNull();
  });

  it("shows an N/M indicator on split parts", () => {
    const partTwo: SplitCard = { ...card, partIndex: 2, partTotal: 3, title: "Slow (2/3)" };
    render(<CardFace card={partTwo} />);

    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("renders without crashing when legacy persisted data is missing new fields", () => {
    const legacyCard = {
      id: "legacy-1",
      title: "Legacy",
      kind: "spell",
      rankOrLevel: "Rank 1",
    } as unknown as SplitCard;

    expect(() => render(<CardFace card={legacyCard} />)).not.toThrow();
    expect(screen.getByRole("heading", { level: 3, name: "Legacy" })).toBeInTheDocument();
  });
});
