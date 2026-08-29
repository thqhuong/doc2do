import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("regression: browser-session action plan", () => {
  afterEach(() => vi.useRealTimers());

  it("restores the result and checklist progress after a reload", async () => {
    vi.useFakeTimers();
    const firstRender = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /try the scholarship sample/i }));
    await act(async () => { await vi.runAllTimersAsync(); });
    fireEvent.click(screen.getByRole("button", { name: /mark complete: draft the 500-word motivation essay/i }));
    expect(screen.getByText("25% complete")).toBeVisible();

    firstRender.unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "AI Future Leaders Scholarship 2026" })).toBeVisible();
    expect(screen.getByText("25% complete")).toBeVisible();
    expect(screen.getByRole("button", { name: /mark incomplete: draft the 500-word motivation essay/i })).toBePressed();
  });
});
