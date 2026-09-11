import { describe, expect, it, vi } from "vitest";
import { IntegrationError } from "./errors";
import { createMetaAdapter } from "./meta";

// Credentials are injected directly rather than via process.env (see
// getCredentials's doc comment) — a prior version of this file mutated
// process.env and caused an intermittent cross-file race under Vitest's
// parallel workers (BUG #002/#004).
const CREDENTIALS = { appId: "test-app-id", appSecret: "test-app-secret" };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, statusText: "error" } as unknown as Response;
}

describe("createMetaAdapter (Facebook Login for Business)", () => {
  it("builds an authorization url with Facebook Page scopes", () => {
    const adapter = createMetaAdapter(fetch, CREDENTIALS);
    const url = new URL(adapter.buildAuthorizationUrl("state123", "https://app.example/cb"));
    expect(url.searchParams.get("client_id")).toBe("test-app-id");
    expect(url.searchParams.get("state")).toBe("state123");
    expect(url.searchParams.get("scope")).toContain("pages_show_list");
  });

  it("throws MISSING_CREDENTIALS if no credentials are available (no override, no env)", () => {
    const adapter = createMetaAdapter(fetch);
    expect(() => adapter.buildAuthorizationUrl("s", "https://app.example/cb")).toThrow(
      IntegrationError,
    );
  });

  it("exchanges a code for a long-lived token via two hops", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "short", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: "long", expires_in: 5184000 }));

    const adapter = createMetaAdapter(fetchImpl, CREDENTIALS);
    const result = await adapter.exchangeCode("auth-code", "https://app.example/cb");

    expect(result.accessToken).toBe("long");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondCallUrl = new URL(fetchImpl.mock.calls[1]?.[0]);
    expect(secondCallUrl.searchParams.get("fb_exchange_token")).toBe("short");
  });

  it("throws PROVIDER_ERROR when the Graph API returns an error body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: "bad code" } }, false, 400));
    const adapter = createMetaAdapter(fetchImpl, CREDENTIALS);
    await expect(adapter.exchangeCode("bad-code", "https://app.example/cb")).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("discoverAccounts returns all Pages", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: "page1", name: "Page One" },
          { id: "page2", name: "Page Two" },
        ],
      }),
    );
    const accounts = await createMetaAdapter(fetchImpl, CREDENTIALS).discoverAccounts("token");
    expect(accounts).toEqual([
      { externalAccountId: "page1", externalAccountName: "Page One" },
      { externalAccountId: "page2", externalAccountName: "Page Two" },
    ]);
  });
});
