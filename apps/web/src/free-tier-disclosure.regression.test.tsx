import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("regression: Gemini Free Tier disclosure", () => {
  it("states the real storage boundary and warns before document submission", () => {
    render(<App />);

    expect(screen.getByText("Files aren't stored")).toBeVisible();
    expect(screen.getByText(/Gemini Free Tier processes it/i)).toHaveTextContent(
      /do not upload sensitive, confidential, or personal information/i,
    );
    expect(screen.getByRole("link", { name: /review Gemini data terms/i })).toHaveAttribute(
      "href",
      "https://ai.google.dev/gemini-api/terms",
    );
  });
});
