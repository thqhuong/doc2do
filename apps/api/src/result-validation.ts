import { doc2DoResultSchema, type Doc2DoResult } from "@doc2do/contracts";
import { z } from "zod";

const blockedHostnames = new Set(["localhost", "0.0.0.0", "::1"]);

function isPrivateIpv4(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((part) => part > 255)) return true;
  const [a = 0, b = 0] = octets;
  return a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    return (url.protocol === "https:" || url.protocol === "http:")
      && !url.username
      && !url.password
      && !blockedHostnames.has(hostname)
      && !hostname.endsWith(".local")
      && !hostname.endsWith(".internal")
      && !/^(?:fc|fd|fe[89ab])/i.test(hostname.replaceAll(":", ""))
      && !isPrivateIpv4(hostname);
  } catch {
    return false;
  }
}

function assertUniqueIds(result: Doc2DoResult): void {
  for (const [label, ids] of [
    ["source", result.source_refs.map((item) => item.id)],
    ["deadline", result.deadlines.map((item) => item.id)],
    ["action", result.actions.map((item) => item.id)],
  ] as const) {
    if (new Set(ids).size !== ids.length) {
      throw new z.ZodError([{
        code: "custom",
        path: [`${label}_ids`],
        message: `Duplicate ${label} id`,
      }]);
    }
  }
}

function assertWarningReferences(result: Doc2DoResult): void {
  const sourceIds = new Set(result.source_refs.map((item) => item.id));
  for (const [index, warning] of result.warnings.entries()) {
    for (const sourceId of warning.source_refs) {
      if (!sourceIds.has(sourceId)) {
        throw new z.ZodError([{
          code: "custom",
          path: ["warnings", index, "source_refs"],
          message: `Unknown source reference: ${sourceId}`,
        }]);
      }
    }
  }
}

const explicitCalendarDatePattern = /(?:\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/;
const vietnamContextPattern = /(?:việt nam|vietnam)/i;

function assertExplicitVietnamDeadlineConsistency(result: Doc2DoResult): void {
  const sourceById = new Map(result.source_refs.map((source) => [source.id, source.snippet]));
  const hasVietnamContext = [
    result.document.issuer ?? "",
    result.document.summary,
    ...result.document.audience,
    ...result.source_refs.map((source) => source.snippet),
  ].some((value) => vietnamContextPattern.test(value));

  if (!hasVietnamContext) return;

  for (const [index, deadline] of result.deadlines.entries()) {
    if (deadline.date_time_iso !== null) continue;
    const citedText = deadline.source_refs
      .map((sourceId) => sourceById.get(sourceId) ?? "")
      .join(" ");
    if (!explicitCalendarDatePattern.test(citedText)) continue;

    throw new z.ZodError([{
      code: "custom",
      path: ["deadlines", index, "date_time_iso"],
      message: "A cited Vietnamese source contains an explicit calendar date. Preserve it as a +07:00 reviewable inference when the timezone is omitted.",
    }]);
  }
}

/** Strictly validates model data, then removes links that could target local/private systems. */
export function validateAndSanitizeResult(value: unknown): Doc2DoResult {
  const result = doc2DoResultSchema.parse(value);
  assertUniqueIds(result);
  assertWarningReferences(result);
  assertExplicitVietnamDeadlineConsistency(result);
  return {
    ...result,
    actions: result.actions.map((action) => ({
      ...action,
      links: action.links.filter((link) => isSafePublicUrl(link.url)),
    })),
  };
}

export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .slice(0, 12)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}
