import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.6-flash"),
  DOC2DO_DEMO_MODE: booleanString,
  CORS_ORIGIN: z.string().trim().optional(),
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  geminiApiKey?: string;
  geminiModel: string;
  demoMode: boolean;
  corsOrigins: string[];
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const origins = parsed.CORS_ORIGIN
    ? parsed.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : parsed.NODE_ENV === "development"
      ? ["http://localhost:5173"]
      : [];

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    ...(parsed.GEMINI_API_KEY ? { geminiApiKey: parsed.GEMINI_API_KEY } : {}),
    geminiModel: parsed.GEMINI_MODEL,
    demoMode: parsed.DOC2DO_DEMO_MODE || !parsed.GEMINI_API_KEY,
    corsOrigins: origins,
  };
}
