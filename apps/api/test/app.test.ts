import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analysisResponseSchema, doc2DoResultSchema } from "@doc2do/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { isSafePublicUrl, validateAndSanitizeResult } from "../src/result-validation.js";

const config: AppConfig = {
  nodeEnv: "test",
  port: 8080,
  geminiModel: "test-model",
  demoMode: true,
  corsOrigins: [],
};

const fixturePath = [
  resolve(process.cwd(), "tests/fixtures/demo-analysis.json"),
  resolve(process.cwd(), "../../tests/fixtures/demo-analysis.json"),
].find(existsSync);

type MutableFixture = Record<string, unknown> & {
  actions: Array<{
    links: Array<{ label: string; url: string }>;
    source_refs: string[];
  }>;
};

async function readFixture(): Promise<MutableFixture> {
  if (!fixturePath) throw new Error("Demo fixture was not found.");
  return JSON.parse(await readFile(fixturePath, "utf8")) as MutableFixture;
}

describe("Doc2Do API", () => {
  it("reports health without exposing configuration", async () => {
    const response = await request(createApp(config)).get("/api/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.body).not.toHaveProperty("geminiApiKey");
  });

  it("returns a contract-valid deterministic demo analysis", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .field("context", "Tôi là sinh viên năm hai.")
      .attach("document", Buffer.from("sanitized demo document"), {
        filename: "notice.txt",
        contentType: "text/plain",
      })
      .expect(201);

    expect(analysisResponseSchema.parse(response.body).mode).toBe("demo");
    expect(response.body.result.next_best_action_id).toBe("action-1");
  });

  it("requires a document", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .field("context", "No file")
      .expect(400);
    expect(response.body.error.code).toBe("DOCUMENT_REQUIRED");
  });

  it("accepts pasted text without a file", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .field("text", "Hạn nộp hồ sơ là ngày 30/09/2026.")
      .field("context", "Tôi là sinh viên năm hai.")
      .expect(201);
    expect(analysisResponseSchema.parse(response.body).mode).toBe("demo");
  });

  it("rejects ambiguous file and pasted-text input", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .field("text", "Pasted notice")
      .attach("document", Buffer.from("file notice"), {
        filename: "notice.txt",
        contentType: "text/plain",
      })
      .expect(400);
    expect(response.body.error.code).toBe("DOCUMENT_INPUT_CONFLICT");
  });

  it("rejects an unsupported document MIME type", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .attach("document", Buffer.from("binary"), {
        filename: "archive.zip",
        contentType: "application/zip",
      })
      .expect(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_DOCUMENT_TYPE");
  });

  it("rejects content that does not match the declared MIME type", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .attach("document", Buffer.from("not really a PDF"), {
        filename: "notice.pdf",
        contentType: "application/pdf",
      })
      .expect(415);
    expect(response.body.error.code).toBe("INVALID_DOCUMENT_CONTENT");
  });

  it("rejects overlong user context", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .field("context", "x".repeat(2_001))
      .attach("document", Buffer.from("notice"), {
        filename: "notice.txt",
        contentType: "text/plain",
      })
      .expect(400);
    expect(response.body.error.code).toBe("INVALID_CONTEXT");
  });
});

describe("result validation", () => {
  it("keeps the sanitized fixture contract-valid", async () => {
    const fixture = await readFixture();
    expect(doc2DoResultSchema.parse(fixture).schema_version).toBe("1.0");
  });

  it("drops private or credential-bearing links after schema validation", async () => {
    const fixture = await readFixture();
    fixture.actions[0].links = [
      { label: "private", url: "http://127.0.0.1/admin" },
      { label: "credentials", url: "https://user:pass@example.com" },
      { label: "public", url: "https://example.com/apply" },
    ];
    const result = validateAndSanitizeResult(fixture);
    expect(result.actions[0]?.links).toEqual([{ label: "public", url: "https://example.com/apply" }]);
    expect(isSafePublicUrl("http://192.168.1.1")).toBe(false);
  });

  it("rejects dangling source references", async () => {
    const fixture = await readFixture();
    fixture.actions[0].source_refs = ["src-missing"];
    expect(() => validateAndSanitizeResult(fixture)).toThrow();
  });
});
