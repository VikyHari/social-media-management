import { describe, expect, it, vi } from "vitest";
import { IntegrationError } from "./errors";
import { createGoogleAdapter } from "./google";

// Credentials are injected directly rather than via process.env — see
// meta.test.ts's comment for why (BUG #002/#004).
const CREDENTIALS = { clientId: "test-client-id", clientSecret: "test-client-secret" };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, statusText: "error" } as unknown as Response;
}

describe("createGoogleAdapter", () => {
  it("builds an authorization url requesting offline access and a refresh token", () => {
    const adapter = createGoogleAdapter(fetch, CREDENTIALS);
    const url = new URL(adapter.buildAuthorizationUrl("state123", "https://app.example/cb"));
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("state")).toBe("state123");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain("youtube.readonly");
  });

  it("throws MISSING_CREDENTIALS if no credentials are available (no override, no env)", () => {
    const adapter = createGoogleAdapter(fetch);
    expect(() => adapter.buildAuthorizationUrl("s", "https://app.example/cb")).toThrow(
      IntegrationError,
    );
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

    const adapter = createGoogleAdapter(fetchImpl, CREDENTIALS);
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
    const adapter = createGoogleAdapter(fetchImpl, CREDENTIALS);
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
    const accounts = await createGoogleAdapter(fetchImpl, CREDENTIALS).discoverAccounts(
      "access-token",
    );

    expect(accounts).toEqual([
      { externalAccountId: "channel1", externalAccountName: "My Channel" },
    ]);
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.headers.authorization).toBe("Bearer access-token");
  });
});
