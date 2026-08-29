import { once } from "node:events";
import { createApp } from "../apps/api/dist/app.js";

const app = createApp({
  nodeEnv: "production",
  port: 0,
  geminiModel: "gemini-3.6-flash",
  demoMode: true,
  corsOrigins: [],
});

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");

try {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Smoke server did not expose a TCP port.");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || health.status !== "ok") {
    throw new Error("Health endpoint failed.");
  }

  const rootResponse = await fetch(baseUrl);
  const rootHtml = await rootResponse.text();
  if (!rootResponse.ok || !rootHtml.includes("Doc2Do")) {
    throw new Error("Built SPA was not served from the root URL.");
  }

  const form = new FormData();
  form.set(
    "text",
    "AI Future Leaders Scholarship 2026. Third-year technology students with GPA 3.2 or higher may apply by 17:00 on 12 September 2026.",
  );
  form.set("context", "I am Lan, a third-year computer science student with GPA 3.4.");
  const analysisResponse = await fetch(`${baseUrl}/api/v1/analyses`, {
    method: "POST",
    body: form,
  });
  const analysis = await analysisResponse.json();
  if (
    analysisResponse.status !== 201
    || analysis.status !== "complete"
    || analysis.mode !== "demo"
    || analysis.result?.actions?.length < 1
  ) {
    throw new Error("Demo analysis flow failed.");
  }

  console.log(JSON.stringify({
    health: health.status,
    root: rootResponse.status,
    analysis: analysis.status,
    mode: analysis.mode,
    actions: analysis.result.actions.length,
  }));
} finally {
  server.close();
  await once(server, "close");
}
