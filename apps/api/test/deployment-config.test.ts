import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_BYTES } from "../src/upload.js";

const cloudBuildPath = [
  resolve(process.cwd(), "cloudbuild.yaml"),
  resolve(process.cwd(), "../../cloudbuild.yaml"),
].find(existsSync);

describe("Cloud Run deployment contract", () => {
  it("gives documents within the advertised limit enough bounded analysis time", () => {
    if (!cloudBuildPath) throw new Error("cloudbuild.yaml was not found.");
    const cloudBuild = readFileSync(cloudBuildPath, "utf8");

    expect(MAX_DOCUMENT_BYTES).toBe(10 * 1024 * 1024);
    expect(cloudBuild).toContain("--timeout=180s");
    expect(cloudBuild).toContain("--max=2");
    expect(cloudBuild).toContain("--max-instances=2");
  });
});
