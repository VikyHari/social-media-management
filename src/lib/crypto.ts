import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEnv } from "./env";

/**
 * AES-256-GCM encryption for secrets at rest — currently OAuth access/refresh
 * tokens (Part 44/52). Never store a plaintext token; this is the only way
 * any module should turn one into something safe to put in the database.
 *
 * Ciphertext format: base64(iv [12 bytes] + authTag [16 bytes] + ciphertext).
 * A fresh random IV is generated per call, so encrypting the same plaintext
 * twice produces different output (no ciphertext-reuse signal).
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  return Buffer.from(getEnv().TOKEN_ENCRYPTION_KEY, "hex"); // 64 hex chars = 32 bytes
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
