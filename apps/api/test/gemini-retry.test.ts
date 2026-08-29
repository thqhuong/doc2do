import { describe, expect, it, vi } from "vitest";
import { withTransientGeminiRetry } from "../src/gemini.js";

describe("Gemini transient retry", () => {
  it("backs off for temporary quota and availability failures", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: "503 UNAVAILABLE" })
      .mockResolvedValue("complete");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransientGeminiRetry(operation, { baseDelayMs: 100, sleep })).resolves.toBe("complete");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it("does not retry authentication or invalid-request failures", async () => {
    const failure = { status: 400, message: "Bad request" };
    const operation = vi.fn().mockRejectedValue(failure);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransientGeminiRetry(operation, { sleep })).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("stops after the configured attempt limit", async () => {
    const failure = { status: 503, message: "Unavailable" };
    const operation = vi.fn().mockRejectedValue(failure);

    await expect(withTransientGeminiRetry(operation, {
      maxAttempts: 2,
      sleep: async () => undefined,
    })).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
