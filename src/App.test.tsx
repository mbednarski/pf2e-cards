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
  it("supports parse to batch to print preview", async () => {
    const user = userEvent.setup();
    const parser = new MockParser(successfulParse);
    render(<App parser={parser} />);

    await user.type(screen.getByLabelText(/^API key$/i), "sk-test");
    await user.type(screen.getByLabelText(/AoN source text/i), "Fireball source text");
    await user.click(screen.getByRole("button", { name: "Parse" }));

    expect(await screen.findByText(/1 planned print card from the current parse/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add to Batch" }));

    expect(await screen.findByRole("heading", { name: "Batch" })).toBeInTheDocument();
    expect(screen.getByText(/1 card entries ready/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview Print" }));

    expect(await screen.findByRole("heading", { name: "Print Preview" })).toBeInTheDocument();
    expect(screen.getByText(/A4 Page 1/i)).toBeInTheDocument();
  });

  it("persists the batch and optional API key in local storage", async () => {
    const user = userEvent.setup();
    const parser = new MockParser(successfulParse);
    const { unmount } = render(<App parser={parser} />);

    await user.type(screen.getByLabelText(/^API key$/i), "sk-persisted");
    await user.click(screen.getByLabelText(/Store the API key/i));
    await user.type(screen.getByLabelText(/AoN source text/i), "Fireball source text");
    await user.click(screen.getByRole("button", { name: "Parse" }));
    await screen.findByText(/1 planned print card from the current parse/i);
    await user.click(screen.getByRole("button", { name: "Add to Batch" }));

    unmount();

    render(<App parser={parser} />);
    await user.click(screen.getByRole("button", { name: "Batch" }));

    expect(await screen.findByText(/1 card entries ready/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("sk-persisted")).toBeInTheDocument();

    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(persisted.batch).toHaveLength(1);
  });

  it("blocks ambiguous cards until the user confirms warnings", async () => {
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

    const addButton = screen.getByRole("button", { name: "Add to Batch" });
    expect(addButton).toBeDisabled();

    await user.click(screen.getByLabelText(/I reviewed the warnings/i));

    await waitFor(() => {
      expect(addButton).toBeEnabled();
    });
  });
});
