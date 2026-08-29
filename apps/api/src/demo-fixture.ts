import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Doc2DoResult } from "@doc2do/contracts";
import { validateAndSanitizeResult } from "./result-validation.js";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

const fixtureCandidates = () => [
  process.env.DOC2DO_DEMO_FIXTURE_PATH,
  resolve(process.cwd(), "tests", "fixtures", "demo-analysis.json"),
  resolve(process.cwd(), "../../tests", "fixtures", "demo-analysis.json"),
  resolve(moduleDirectory, "../../../tests/fixtures/demo-analysis.json"),
].filter((candidate): candidate is string => Boolean(candidate));

let cachedFixture: Doc2DoResult | undefined;

export async function loadDemoFixture(): Promise<Doc2DoResult> {
  if (cachedFixture) return structuredClone(cachedFixture);
  for (const candidate of fixtureCandidates()) {
    try {
      const raw = await readFile(candidate, "utf8");
      cachedFixture = validateAndSanitizeResult(JSON.parse(raw));
      return structuredClone(cachedFixture);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }
  throw new Error("The sanitized demo fixture is missing.");
}
