/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Single-process only: resets on restart and is not shared across instances.
 * That's an acceptable limit for a single-instance MVP; swap for a shared
 * store (e.g. Redis) before running multiple instances in production.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max allowed attempts within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the window resets. 0 when `allowed` is true. */
  retryAfterMs: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= opts.limit) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: opts.limit - existing.count, retryAfterMs: 0 };
}

/** Test helper: clear all buckets between test cases. */
export function resetRateLimits(): void {
  buckets.clear();
}
