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
    { label: "Range / Area / Targets", value: "30 feet; 1 creature" },
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
  it("renders kind, rank, title, and inline traits", () => {
    render(<CardFace card={card} />);

    expect(screen.getByText("SPELL")).toBeInTheDocument();
    expect(screen.getByText("Rank 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Slow" })).toBeInTheDocument();
    expect(screen.getByText("concentrate")).toBeInTheDocument();
    expect(screen.getByText("manipulate")).toBeInTheDocument();
  });

  it("renders an action glyph for two-actions and hides the cast text", () => {
    const { container } = render(<CardFace card={card} />);

    expect(screen.getByRole("img", { name: "2 actions" })).toBeInTheDocument();
    expect(container.querySelector(".action-glyph-two-actions")).not.toBeNull();
    expect(screen.queryByText("two-actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Cast / Activate")).not.toBeInTheDocument();
  });

  it("renders the inline stat row with short labels and drops cast/traditions from it", () => {
    const { container } = render(<CardFace card={card} />);

    const stats = container.querySelector(".card-stats");
    expect(stats).not.toBeNull();
    expect(within(stats as HTMLElement).getByText("Range")).toBeInTheDocument();
    expect(within(stats as HTMLElement).getByText("Defense")).toBeInTheDocument();
    expect(within(stats as HTMLElement).getByText("Fortitude")).toBeInTheDocument();
    expect(within(stats as HTMLElement).queryByText("Traditions")).not.toBeInTheDocument();
    expect(within(stats as HTMLElement).queryByText("Cast")).not.toBeInTheDocument();

    const rangeValue = stats!.querySelectorAll(".card-stat-value")[0];
    expect(rangeValue.textContent).toBe("30 feet; 1 creature");
  });

  it("renders the save ladder as a structured list and skips duplicate saving-throw lines", () => {
    const { container } = render(<CardFace card={card} />);

    const ladder = container.querySelector(".card-ladder");
    expect(ladder).not.toBeNull();
    const labels = Array.from(ladder!.querySelectorAll("dt")).map((node) => node.textContent);
    expect(labels).toEqual(["Crit. Success", "Success", "Failure", "Crit. Failure"]);

    expect(screen.queryByText(/Saving Throw/i)).not.toBeInTheDocument();
  });

  it("renders the heightened line with a bold leader", () => {
    const { container } = render(<CardFace card={card} />);

    const heightened = container.querySelector(".card-prose-heightened");
    expect(heightened).not.toBeNull();
    expect(heightened!.querySelector("strong")?.textContent).toMatch(/Heightened \(6th\)/);
    expect(heightened!.textContent).toContain("target up to 10");
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
