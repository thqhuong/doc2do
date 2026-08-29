import multer from "multer";
import { ApiError } from "./errors.js";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARACTERS = 50_000;

export const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_BYTES,
    files: 1,
    fields: 2,
    fieldSize: MAX_TEXT_CHARACTERS * 4,
  },
  fileFilter: (_request, file, callback) => {
    if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
      return callback(new ApiError(415, "UNSUPPORTED_DOCUMENT_TYPE", "This document type is not supported."));
    }
    return callback(null, true);
  },
});

export function hasValidDocumentSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length === 0) return false;
  switch (mimeType) {
    case "application/pdf":
      return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    case "image/png":
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/webp":
      return buffer.subarray(0, 4).toString("ascii") === "RIFF"
        && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "text/plain":
      if (buffer.includes(0)) return false;
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}
