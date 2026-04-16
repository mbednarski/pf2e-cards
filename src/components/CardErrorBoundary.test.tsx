import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CardErrorBoundary from "./CardErrorBoundary";

function Boom(): null {
  throw new Error("kaboom");
}

describe("CardErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when they do not throw", () => {
    render(
      <CardErrorBoundary>
        <div>healthy content</div>
      </CardErrorBoundary>,
    );

    expect(screen.getByText("healthy content")).toBeInTheDocument();
  });

  it("shows a fallback card when the child throws during render", () => {
    render(
      <CardErrorBoundary fallbackTitle="Broken card title">
        <Boom />
      </CardErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Unable to render card")).toBeInTheDocument();
    expect(screen.getByText("Broken card title")).toBeInTheDocument();
  });
});
