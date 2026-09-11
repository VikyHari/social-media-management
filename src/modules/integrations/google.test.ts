import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { IntegrationError } from "./errors";
import { createGoogleAdapter } from "./google";

const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  resetEnvCache();
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
  resetEnvCache();
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, statusText: "error" } as unknown as Response;
}

describe("createGoogleAdapter", () => {
  it("builds an authorization url requesting offline access and a refresh token", () => {
    const adapter = createGoogleAdapter();
    const url = new URL(adapter.buildAuthorizationUrl("state123", "https://app.example/cb"));
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("state")).toBe("state123");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain("youtube.readonly");
  });

  it("throws MISSING_CREDENTIALS if the Google client isn't configured", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    resetEnvCache();
    const adapter = createGoogleAdapter();
    expect(() => adapter.buildAuthorizationUrl("s", "https://app.example/cb")).toThrow(
      IntegrationError,
    );
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    resetEnvCache();
  });

  it("exchanges a code for an access token and refresh token via a POST", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/youtube.readonly",
      }),
    );

    const adapter = createGoogleAdapter(fetchImpl);
    const result = await adapter.exchangeCode("auth-code", "https://app.example/cb");

    expect(result.accessToken).toBe("access-123");
    expect(result.refreshToken).toBe("refresh-456");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init.method).toBe("POST");
    expect(init.body).toContain("grant_type=authorization_code");
  });

  it("throws PROVIDER_ERROR when the token endpoint returns an error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "invalid_grant" }, false, 400));
    const adapter = createGoogleAdapter(fetchImpl);
    await expect(adapter.exchangeCode("bad-code", "https://app.example/cb")).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("discoverAccounts returns the authenticated user's channel via a Bearer token", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ id: "channel1", snippet: { title: "My Channel" } }] }),
      );
    const accounts = await createGoogleAdapter(fetchImpl).discoverAccounts("access-token");

    expect(accounts).toEqual([
      { externalAccountId: "channel1", externalAccountName: "My Channel" },
    ]);
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.headers.authorization).toBe("Bearer access-token");
  });
});
