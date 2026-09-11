import { describe, expect, it, vi } from "vitest";
import { IntegrationError } from "./errors";
import { createInstagramAdapter } from "./instagram";

// Credentials are injected directly rather than via process.env — see
// meta.test.ts's comment for why (BUG #002/#004).
const CREDENTIALS = { appId: "test-ig-app-id", appSecret: "test-ig-app-secret" };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, statusText: "error" } as unknown as Response;
}

describe("createInstagramAdapter (Instagram Business Login)", () => {
  it("builds an authorization url on instagram.com with the business_basic scope", () => {
    const adapter = createInstagramAdapter(fetch, CREDENTIALS);
    const url = new URL(adapter.buildAuthorizationUrl("state123", "https://app.example/cb"));
    expect(url.origin).toBe("https://www.instagram.com");
    expect(url.searchParams.get("client_id")).toBe("test-ig-app-id");
    expect(url.searchParams.get("state")).toBe("state123");
    expect(url.searchParams.get("scope")).toBe("instagram_business_basic");
  });

  it("throws MISSING_CREDENTIALS if no credentials are available (no override, no env)", () => {
    const adapter = createInstagramAdapter(fetch);
    expect(() => adapter.buildAuthorizationUrl("s", "https://app.example/cb")).toThrow(
      IntegrationError,
    );
  });

  it("exchanges a code for a long-lived token via a POST then a GET, using the data[0] shape", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ access_token: "short", user_id: "u1", permissions: "instagram_business_basic" }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ access_token: "long", expires_in: 5184000 }));

    const adapter = createInstagramAdapter(fetchImpl, CREDENTIALS);
    const result = await adapter.exchangeCode("auth-code", "https://app.example/cb");

    expect(result.accessToken).toBe("long");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const [firstUrl, firstInit] = fetchImpl.mock.calls[0]!;
    expect(firstUrl).toBe("https://api.instagram.com/oauth/access_token");
    expect(firstInit.method).toBe("POST");
    expect(firstInit.body).toContain("grant_type=authorization_code");

    const secondUrl = new URL(fetchImpl.mock.calls[1]?.[0]);
    expect(secondUrl.hostname).toBe("graph.instagram.com");
    expect(secondUrl.searchParams.get("grant_type")).toBe("ig_exchange_token");
    expect(secondUrl.searchParams.get("access_token")).toBe("short");
  });

  it("throws PROVIDER_ERROR when the short-lived exchange has no token", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }));
    const adapter = createInstagramAdapter(fetchImpl, CREDENTIALS);
    await expect(adapter.exchangeCode("bad-code", "https://app.example/cb")).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("throws PROVIDER_ERROR when Instagram returns an error body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error_message: "Invalid authorization code" }, false, 400),
      );
    const adapter = createInstagramAdapter(fetchImpl, CREDENTIALS);
    await expect(adapter.exchangeCode("bad-code", "https://app.example/cb")).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("discoverAccounts returns the connected Instagram professional account", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ user_id: "17800000000000000", username: "my_creator_handle" }),
      );
    const accounts = await createInstagramAdapter(fetchImpl, CREDENTIALS).discoverAccounts(
      "access-token",
    );

    expect(accounts).toEqual([
      { externalAccountId: "17800000000000000", externalAccountName: "my_creator_handle" },
    ]);
    const url = new URL(fetchImpl.mock.calls[0]?.[0]);
    expect(url.hostname).toBe("graph.instagram.com");
    expect(url.searchParams.get("access_token")).toBe("access-token");
  });
});
