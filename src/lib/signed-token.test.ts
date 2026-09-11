import { describe, expect, it, vi } from "vitest";
import { signToken, verifyToken } from "./signed-token";

describe("signToken / verifyToken", () => {
  it("round-trips the payload for the same purpose", () => {
    const token = signToken("oauth.state", { userId: "u1", platform: "instagram" });
    expect(verifyToken("oauth.state", token)).toEqual({ userId: "u1", platform: "instagram" });
  });

  it("rejects a token verified under the wrong purpose", () => {
    const token = signToken("oauth.state", { userId: "u1" });
    expect(verifyToken("something.else", token)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = signToken("oauth.state", { userId: "u1" });
    const [, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ data: { userId: "attacker" }, expiresAt: Date.now() + 60000 }),
    ).toString("base64url");
    expect(verifyToken("oauth.state", `${tamperedPayload}.${signature}`)).toBeNull();
  });

  it("rejects garbage input without throwing", () => {
    expect(verifyToken("oauth.state", "not-a-real-token")).toBeNull();
    expect(verifyToken("oauth.state", "")).toBeNull();
  });

  it("expires after its ttl", () => {
    vi.useFakeTimers();
    const token = signToken("oauth.state", { userId: "u1" }, 1000);
    expect(verifyToken("oauth.state", token)).not.toBeNull();
    vi.advanceTimersByTime(1001);
    expect(verifyToken("oauth.state", token)).toBeNull();
    vi.useRealTimers();
  });
});
