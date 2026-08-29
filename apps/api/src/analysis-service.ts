import { randomUUID } from "node:crypto";
import { analysisResponseSchema, type AnalysisResponse } from "@doc2do/contracts";
import type { AppConfig } from "./config.js";
import { loadDemoFixture } from "./demo-fixture.js";
import { analyzeWithGemini, type DocumentInput } from "./gemini.js";

export async function analyzeDocument(input: DocumentInput, config: AppConfig): Promise<AnalysisResponse> {
  const mode = config.demoMode ? "demo" : "gemini";
  const result = mode === "demo"
    ? await loadDemoFixture()
    : await analyzeWithGemini(input, {
        apiKey: config.geminiApiKey!,
        model: config.geminiModel,
      });

  return analysisResponseSchema.parse({
    id: randomUUID(),
    status: "complete",
    mode,
    result,
    created_at: new Date().toISOString(),
  });
}
