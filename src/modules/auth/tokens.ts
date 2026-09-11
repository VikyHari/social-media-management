import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Session tokens are opaque random values handed to the browser in a cookie.
 * Only an HMAC of the token (keyed by SESSION_SECRET) is ever stored in the
 * database, so a leaked database cannot be used to mint valid session
 * cookies, and a leaked SESSION_SECRET alone (without the token) is useless.
 */
const TOKEN_BYTES = 32;

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHmac("sha256", getEnv().SESSION_SECRET).update(token).digest("hex");
}

/** Constant-time comparison, for any path that compares two hashes directly. */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
