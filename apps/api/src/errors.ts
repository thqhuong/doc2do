export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function publicErrorDetails(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.slice(0, 10);
  return value;
}
