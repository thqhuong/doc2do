import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl } from "./ics";

describe("Google Calendar integration", () => {
  it("creates a reviewed, pre-filled event without writing to the calendar", () => {
    const url = new URL(buildGoogleCalendarUrl({
      title: "Submit scholarship application",
      description: "Verify the original notice first.",
      start: "2026-09-12T17:00:00+07:00",
      durationMinutes: 30,
      reminderMinutes: 1440,
    }));

    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.pathname).toBe("/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Submit scholarship application");
    expect(url.searchParams.get("dates")).toBe("20260912T100000Z/20260912T103000Z");
    expect(url.searchParams.get("details")).toBe("Verify the original notice first.");
  });

  it("rejects an invalid start time", () => {
    expect(() => buildGoogleCalendarUrl({
      title: "Deadline",
      description: "Review first",
      start: "not-a-date",
      durationMinutes: 30,
      reminderMinutes: 60,
    })).toThrow(/valid start time/i);
  });
});
