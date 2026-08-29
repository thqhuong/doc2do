export interface CalendarEventDraft {
  title: string;
  description: string;
  start: string;
  durationMinutes: number;
  reminderMinutes: number;
}

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(event: CalendarEventDraft): string {
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) throw new Error("Calendar event needs a valid start time.");
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatUtc(start)}/${formatUtc(end)}`,
    details: event.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcs(event: CalendarEventDraft): string {
  const start = new Date(event.start);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const now = new Date();
  const uid = `doc2do-${start.getTime()}@doc2do.app`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Doc2Do//Action Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    "BEGIN:VALARM",
    `TRIGGER:-PT${event.reminderMinutes}M`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(event: CalendarEventDraft): void {
  const blob = new Blob([createIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "doc2do-deadline.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}
