import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "./env";

/**
 * Short-lived, tamper-proof, opaque tokens for things like OAuth CSRF state —
 * not a session mechanism (see src/modules/auth for that). Format:
 * base64url(JSON payload) + "." + HMAC-SHA256(purpose + payload, SESSION_SECRET).
 * The `purpose` string is mixed into the signature so a token issued for one
 * purpose can't be replayed as another.
 */
interface SignedPayload {
  data: Record<string, unknown>;
  expiresAt: number; // epoch ms
}

function sign(purpose: string, payloadB64: string): string {
  return createHmac("sha256", getEnv().SESSION_SECRET)
    .update(`${purpose}:${payloadB64}`)
    .digest("hex");
}

export function signToken(
  purpose: string,
  data: Record<string, unknown>,
  ttlMs: number = 10 * 60 * 1000,
): string {
  const payload: SignedPayload = { data, expiresAt: Date.now() + ttlMs };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(purpose, payloadB64)}`;
}

/** Returns the payload if the token is validly signed, unexpired, and for this purpose — else null. */
export function verifyToken<T extends Record<string, unknown> = Record<string, unknown>>(
  purpose: string,
  token: string,
): T | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedHex = sign(purpose, payloadB64);
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SignedPayload;
    if (payload.expiresAt < Date.now()) return null;
    return payload.data as T;
  } catch {
    return null;
  }
}
