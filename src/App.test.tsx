import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEY } from "./constants";
import type { ParserClient, ParserOutput } from "./types";

const successfulParse: ParserOutput = {
  inferredType: "spell",
  confidence: 0.93,
  unresolvedQuestions: [],
  warnings: [],
  selectableOptions: [],
  parsed: {
    name: "Fireball",
    kind: "spell",
    rankOrLevel: "Rank 3",
    traits: ["Fire", "Evocation"],
    description: "A roaring blast of fire deals 6d6 damage in a 20-foot burst.",
    computedValues: ["Deals 6d6 fire damage."],
    boldTokens: ["20-foot burst"],
  },
};

class MockParser implements ParserClient {
  constructor(private readonly result: ParserOutput) {}

  parse = vi.fn(async () => this.result);
}

describe("PF2E cards app", () => {
  it("supports parse and add to page", async () => {
    const user = userEvent.setup();
    const parser = new MockParser(successfulParse);
    render(<App parser={parser} />);

    await user.type(screen.getByLabelText(/^API key$/i), "sk-test");
    await user.type(screen.getByLabelText(/AoN source text/i), "Fireball source text");
    await user.click(screen.getByRole("button", { name: "Parse" }));

    expect(await screen.findByText("Fireball")).toBeInTheDocument();
    expect(screen.getByText(/Spell · Rank 3/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add to Page/i }));

    expect(await screen.findByText(/1 page/i)).toBeInTheDocument();
  });

  it("persists the batch and optional API key in local storage", async () => {
    const user = userEvent.setup();
    const parser = new MockParser(successfulParse);
    const { unmount } = render(<App parser={parser} />);

    await user.type(screen.getByLabelText(/^API key$/i), "sk-persisted");
    await user.click(screen.getByLabelText(/Store API key/i));
    await user.type(screen.getByLabelText(/AoN source text/i), "Fireball source text");
    await user.click(screen.getByRole("button", { name: "Parse" }));
    await screen.findByText("Fireball");
    await user.click(screen.getByRole("button", { name: /Add to Page/i }));

    unmount();

    render(<App parser={parser} />);

    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(persisted.batch).toHaveLength(1);

    // Settings popover is hidden when API key exists — open it
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByDisplayValue("sk-persisted")).toBeInTheDocument();
  });

  it("shows warnings as badges but does not block adding", async () => {
    const user = userEvent.setup();
    const parser = new MockParser({
      ...successfulParse,
      confidence: 0.52,
      unresolvedQuestions: ["Confirm the selected scaling rank."],
    });

    render(<App parser={parser} />);

    await user.type(screen.getByLabelText(/^API key$/i), "sk-test");
    await user.type(screen.getByLabelText(/AoN source text/i), "Ambiguous source text");
    await user.click(screen.getByRole("button", { name: "Parse" }));

    await screen.findByText(/Confirm the selected scaling rank/i);

    // Warnings are shown but add button is NOT blocked (no confirmation required)
    const addButton = screen.getByRole("button", { name: /Add to Page/i });
    expect(addButton).toBeEnabled();
  });
});
