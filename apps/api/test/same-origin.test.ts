import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

const config: AppConfig = {
  nodeEnv: "test",
  port: 8080,
  geminiModel: "test-model",
  demoMode: true,
  corsOrigins: [],
};

describe("analysis request origin protection", () => {
  it("blocks a cross-site browser submission before analysis", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .set("Origin", "https://attacker.example")
      .set("Sec-Fetch-Site", "cross-site")
      .field("text", "This request must never reach the Gemini analysis service.")
      .expect(403);

    expect(response.body.error.code).toBe("CROSS_SITE_REQUEST_BLOCKED");
  });

  it("accepts the public app's same-origin submission", async () => {
    const response = await request(createApp(config))
      .post("/api/v1/analyses")
      .set("Host", "doc2do.example")
      .set("Origin", "http://doc2do.example")
      .set("Sec-Fetch-Site", "same-origin")
      .field("text", "Scholarship applications close on 12 September 2026.")
      .expect(201);

    expect(response.body.mode).toBe("demo");
  });

  it("allows an explicitly configured development origin", async () => {
    const developmentConfig = { ...config, corsOrigins: ["https://preview.example"] };
    const response = await request(createApp(developmentConfig))
      .post("/api/v1/analyses")
      .set("Origin", "https://preview.example")
      .set("Sec-Fetch-Site", "cross-site")
      .field("text", "Scholarship applications close on 12 September 2026.")
      .expect(201);

    expect(response.headers["access-control-allow-origin"]).toBe("https://preview.example");
  });
});
