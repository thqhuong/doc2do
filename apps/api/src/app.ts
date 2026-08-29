import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { z } from "zod";
import { analyzeDocument } from "./analysis-service.js";
import type { AppConfig } from "./config.js";
import { ApiError, publicErrorDetails } from "./errors.js";
import {
  ACCEPTED_MIME_TYPES,
  hasValidDocumentSignature,
  MAX_DOCUMENT_BYTES,
  MAX_TEXT_CHARACTERS,
  uploadDocument,
} from "./upload.js";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const contextSchema = z.string().trim().max(2_000).optional();
const pastedTextSchema = z.string().trim().min(1).max(MAX_TEXT_CHARACTERS).optional();

function findWebDist(): string | undefined {
  return [
    resolve(process.cwd(), "apps/web/dist"),
    resolve(process.cwd(), "../web/dist"),
    resolve(moduleDirectory, "../../web/dist"),
  ].find(existsSync);
}

function corsMiddleware(config: AppConfig) {
  if (config.corsOrigins.length === 0) return cors({ origin: false });
  return cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new ApiError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed."));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  });
}

export function createApp(config: AppConfig) {
  const app = express();
  app.disable("x-powered-by");
  if (config.nodeEnv === "production") app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(corsMiddleware(config));
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(rateLimit({
    windowMs: 60_000,
    limit: config.nodeEnv === "test" ? 1_000 : 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }));

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok", service: "doc2do-api", time: new Date().toISOString() });
  });

  const analysisLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: config.nodeEnv === "test" ? 1_000 : 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  app.post(
    "/api/v1/analyses",
    analysisLimiter,
    uploadDocument.single("document"),
    async (request, response) => {
      const textResult = pastedTextSchema.safeParse(request.body?.text);
      if (!textResult.success) {
        throw new ApiError(
          400,
          "INVALID_TEXT",
          `Pasted text must contain between 1 and ${MAX_TEXT_CHARACTERS.toLocaleString("en-US")} characters.`,
        );
      }
      if (!request.file && !textResult.data) {
        throw new ApiError(
          400,
          "DOCUMENT_REQUIRED",
          `Attach one document using the 'document' field or provide non-empty 'text'. Accepted file types: ${[...ACCEPTED_MIME_TYPES].join(", ")}.`,
        );
      }
      if (request.file && textResult.data) {
        throw new ApiError(400, "DOCUMENT_INPUT_CONFLICT", "Provide either a document or pasted text, not both.");
      }
      if (request.file && !ACCEPTED_MIME_TYPES.has(request.file.mimetype)) {
        throw new ApiError(415, "UNSUPPORTED_DOCUMENT_TYPE", "This document type is not supported.");
      }
      if (request.file && !hasValidDocumentSignature(request.file.buffer, request.file.mimetype)) {
        throw new ApiError(415, "INVALID_DOCUMENT_CONTENT", "The file content does not match its declared document type.");
      }
      const contextResult = contextSchema.safeParse(request.body?.context);
      if (!contextResult.success) {
        throw new ApiError(400, "INVALID_CONTEXT", "Context must be at most 2,000 characters.");
      }
      const analysis = await analyzeDocument({
        bytes: request.file?.buffer ?? Buffer.from(textResult.data!, "utf8"),
        mimeType: request.file?.mimetype ?? "text/plain",
        ...(contextResult.data ? { context: contextResult.data } : {}),
      }, config);
      response.status(201).json(analysis);
    },
  );

  if (config.nodeEnv === "production") {
    const webDist = findWebDist();
    if (webDist) {
      app.use(express.static(webDist, { index: false, maxAge: "1h" }));
      app.use((request, response, next) => {
        if (request.method !== "GET" || request.path.startsWith("/api/")) return next();
        return response.sendFile(resolve(webDist, "index.html"));
      });
    }
  }

  app.use((_request, _response, next) => {
    next(new ApiError(404, "NOT_FOUND", "Route not found."));
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    void _next;
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      return response.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? "DOCUMENT_TOO_LARGE" : "INVALID_MULTIPART_UPLOAD",
          message: tooLarge
            ? `Documents must be ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB or smaller.`
            : "The multipart upload is invalid.",
        },
      });
    }
    if (error instanceof ApiError) {
      return response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: publicErrorDetails(error.details) }),
        },
      });
    }
    if (error instanceof z.ZodError) {
      return response.status(502).json({
        error: { code: "INVALID_ANALYSIS", message: "The analysis did not match the required structure." },
      });
    }
    // Never log request bodies, uploaded bytes, model output, or secrets.
    console.error("Unhandled API error", error instanceof Error ? error.message : "Unknown error");
    return response.status(502).json({
      error: { code: "ANALYSIS_FAILED", message: "The document could not be analyzed. Please try again." },
    });
  });

  return app;
}
