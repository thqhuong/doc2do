import { analysisResponseSchema, type AnalysisResponse } from "@doc2do/contracts";

export type AnalysisInput =
  | { kind: "file"; file: File; context: string }
  | { kind: "text"; text: string; context: string };

export class AnalysisError extends Error {
  constructor(message: string, readonly code = "ANALYSIS_FAILED") {
    super(message);
    this.name = "AnalysisError";
  }
}

export async function createAnalysis(input: AnalysisInput, signal?: AbortSignal): Promise<AnalysisResponse> {
  const payload = new FormData();
  payload.set("context", input.context);

  if (input.kind === "file") {
    payload.set("document", input.file);
  } else {
    payload.set("text", input.text);
  }

  let response: Response;
  try {
    const request: RequestInit = {
      method: "POST",
      body: payload,
      ...(signal ? { signal } : {}),
    };
    response = await fetch("/api/v1/analyses", request);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AnalysisError("We could not reach the analysis service. Check your connection and try again.", "NETWORK_ERROR");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? readApiMessage(body)
        : "The document could not be analyzed. Please try again.";
    throw new AnalysisError(message, `HTTP_${response.status}`);
  }

  const parsed = analysisResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new AnalysisError("The analysis returned an unexpected format. Your document was not saved.", "INVALID_RESPONSE");
  }

  return parsed.data;
}

function readApiMessage(body: object): string {
  const candidate = (body as { error?: { message?: unknown } }).error?.message;
  return typeof candidate === "string" ? candidate : "The document could not be analyzed. Please try again.";
}
