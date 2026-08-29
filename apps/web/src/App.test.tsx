import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { validateFile } from "./App";

describe("Doc2Do frontend", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates supported document types and the 10 MB limit", () => {
    expect(validateFile(new File(["notice"], "notice.pdf", { type: "application/pdf" }))).toBeNull();
    expect(validateFile(new File(["script"], "script.js", { type: "text/javascript" }))).toMatch(/PDF, JPEG, PNG, WebP, or text/);
    const tooLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.pdf", { type: "application/pdf" });
    expect(validateFile(tooLarge)).toMatch(/over 10 MB/);
  });

  it("shows a recoverable error when no input is provided", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /build my action plan/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/add a document first/i);
    expect(screen.getByRole("button", { name: /try the scholarship sample/i })).toBeVisible();
  });

  it("runs the sample through named processing states and renders an editable plan", async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /try the scholarship sample/i }));
    expect(screen.getByRole("heading", { name: /reading your document/i })).toBeVisible();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByRole("heading", { name: "AI Future Leaders Scholarship 2026" })).toBeVisible();
    expect(screen.getByText("Likely eligible")).toBeVisible();
    expect(screen.getByRole("heading", { name: /action checklist/i })).toBeVisible();
    expect(screen.getAllByText("Source-backed").length).toBeGreaterThan(0);

    const completeButton = screen.getByRole("button", { name: /mark complete: draft the 500-word motivation essay/i });
    fireEvent.click(completeButton);
    expect(screen.getByText("25% complete")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /edit draft the 500-word motivation essay/i }));
    const titleInput = screen.getByRole("textbox", { name: "Action title" });
    fireEvent.change(titleInput, { target: { value: "Write scholarship essay outline" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("heading", { name: "Write scholarship essay outline" })).toBeVisible();
  });

  it("opens source evidence and calendar review with explicit consent", async () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /try the scholarship sample/i }));
    await act(async () => { await vi.runAllTimersAsync(); });

    fireEvent.click(screen.getAllByRole("button", { name: /why this/i })[0]!);
    expect(screen.getByRole("dialog", { name: /draft the 500-word motivation essay/i })).toBeVisible();
    expect(screen.getByText(/bài luận động lực không quá 500 từ/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /done reviewing/i }));

    fireEvent.click(screen.getByRole("button", { name: /add deadline/i }));
    expect(screen.getByRole("dialog", { name: /calendar event/i })).toHaveTextContent(/nothing is added automatically/i);
    expect(screen.getByText(/timezone needs confirmation/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /download calendar file/i })).toBeEnabled();
  });
});
