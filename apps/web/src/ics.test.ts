import { describe, expect, it, vi } from "vitest";
import { createIcs, downloadIcs } from "./ics";

describe("calendar export", () => {
  it("creates a valid event and escapes user content", () => {
    const output = createIcs({
      title: "Submit CV, essay; transcript",
      description: "Check source\nThen submit",
      start: "2026-09-12T17:00:00+07:00",
      durationMinutes: 30,
      reminderMinutes: 1440,
    });

    expect(output).toContain("BEGIN:VCALENDAR");
    expect(output).toContain("BEGIN:VEVENT");
    expect(output).toContain("DTSTART:20260912T100000Z");
    expect(output).toContain("DTEND:20260912T103000Z");
    expect(output).toContain("SUMMARY:Submit CV\\, essay\\; transcript");
    expect(output).toContain("DESCRIPTION:Check source\\nThen submit");
    expect(output).toContain("TRIGGER:-PT1440M");
  });

  it("downloads an ICS file without navigating away", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    downloadIcs({
      title: "Deadline",
      description: "Review first",
      start: "2026-09-12T17:00",
      durationMinutes: 30,
      reminderMinutes: 60,
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:doc2do-calendar");
    click.mockRestore();
  });
});
