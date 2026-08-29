import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { demoAnalysis } from "./demo-data";

describe("one-click Gemini sample", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sends the synthetic notice to the API and labels a live model result", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ ...demoAnalysis, mode: "gemini" }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /try the scholarship sample/i }));
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(screen.getByText("Gemini analysis")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/analyses");
    const payload = request?.body as FormData;
    expect(payload.get("text")).toMatch(/HỌC BỔNG AI FUTURE LEADERS 2026/);
    expect(payload.get("context")).toMatch(/third-year computer science student/i);
  });
});
