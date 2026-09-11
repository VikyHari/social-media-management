import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimits } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows attempts up to the limit", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(checkRateLimit("k", opts).allowed).toBe(true);
    expect(checkRateLimit("k", opts).allowed).toBe(true);
    expect(checkRateLimit("k", opts).allowed).toBe(true);
  });

  it("blocks once the limit is exceeded within the window", () => {
    const opts = { limit: 2, windowMs: 1000 };
    checkRateLimit("k", opts);
    checkRateLimit("k", opts);
    const third = checkRateLimit("k", opts);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const opts = { limit: 1, windowMs: 1000 };
    checkRateLimit("k", opts);
    expect(checkRateLimit("k", opts).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("k", opts).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("b", opts).allowed).toBe(true);
  });
});
