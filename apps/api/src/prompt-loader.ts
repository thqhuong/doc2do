import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

const promptCandidates = (filename: string) => [
  resolve(process.cwd(), "prompts", filename),
  resolve(process.cwd(), "../../prompts", filename),
  resolve(moduleDirectory, "../../../prompts", filename),
];

export async function loadPrompt(filename: "system.md" | "repair.md"): Promise<string> {
  for (const candidate of promptCandidates(filename)) {
    try {
      return await readFile(candidate, "utf8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Required prompt file is missing: ${filename}`);
}
