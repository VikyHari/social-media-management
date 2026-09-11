import { describe, expect, it } from "vitest";
import { generateSessionToken, hashSessionToken, safeEqualHex } from "./tokens";

// Relies on the ambient environment already being valid (local .env, or the
// CI workflow's env: block) — same approach as service.test.ts. Deliberately
// does NOT mutate process.env: doing so previously leaked across test files
// sharing a Vitest worker thread and broke unrelated tests (see BUG #002).

describe("session tokens", () => {
  it("generates unique, url-safe tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes the same token to the same value", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("hashes different tokens to different values", () => {
    const a = hashSessionToken(generateSessionToken());
    const b = hashSessionToken(generateSessionToken());
    expect(a).not.toBe(b);
  });

  it("safeEqualHex matches equal hex strings and rejects differing ones", () => {
    const h = hashSessionToken("x");
    expect(safeEqualHex(h, h)).toBe(true);
    expect(safeEqualHex(h, hashSessionToken("y"))).toBe(false);
  });
});
