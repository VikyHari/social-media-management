import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const encrypted = encryptSecret("a-real-oauth-access-token-value");
    expect(encrypted).not.toContain("a-real-oauth-access-token-value");
    expect(decryptSecret(encrypted)).toBe("a-real-oauth-access-token-value");
  });

  it("produces different ciphertext for the same plaintext each time", () => {
    const a = encryptSecret("same value");
    const b = encryptSecret("same value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same value");
    expect(decryptSecret(b)).toBe("same value");
  });

  it("round-trips an empty string and unicode content", () => {
    expect(decryptSecret(encryptSecret(""))).toBe("");
    expect(decryptSecret(encryptSecret("τoken-with-ünïcode-🔑"))).toBe("τoken-with-ünïcode-🔑");
  });

  it("throws if the ciphertext has been tampered with", () => {
    const encrypted = encryptSecret("secret value");
    const tampered = encrypted.slice(0, -4) + "abcd";
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
