import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { IntegrationError } from "./errors";
import { createMetaAdapter } from "./meta";

const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  process.env.META_APP_ID = "test-app-id";
  process.env.META_APP_SECRET = "test-app-secret";
  resetEnvCache();
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
  resetEnvCache();
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, statusText: "error" } as unknown as Response;
}

describe("createMetaAdapter", () => {
  it("builds an authorization url with the right scopes per platform", () => {
    const fb = createMetaAdapter("facebook");
    const fbUrl = new URL(fb.buildAuthorizationUrl("state123", "https://app.example/cb"));
    expect(fbUrl.searchParams.get("client_id")).toBe("test-app-id");
    expect(fbUrl.searchParams.get("state")).toBe("state123");
    expect(fbUrl.searchParams.get("scope")).toContain("pages_show_list");

    const ig = createMetaAdapter("instagram");
    const igUrl = new URL(ig.buildAuthorizationUrl("state123", "https://app.example/cb"));
    expect(igUrl.searchParams.get("scope")).toContain("instagram_basic");
  });

  it("throws MISSING_CREDENTIALS if the Meta app isn't configured", () => {
    delete process.env.META_APP_ID;
    resetEnvCache();
    const adapter = createMetaAdapter("facebook");
    expect(() => adapter.buildAuthorizationUrl("s", "https://app.example/cb")).toThrow(
      IntegrationError,
    );
    process.env.META_APP_ID = "test-app-id";
    resetEnvCache();
  });

  it("exchanges a code for a long-lived token via two hops", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "short", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: "long", expires_in: 5184000 }));

    const adapter = createMetaAdapter("facebook", fetchImpl);
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
    const adapter = createMetaAdapter("facebook", fetchImpl);
    await expect(adapter.exchangeCode("bad-code", "https://app.example/cb")).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("discoverAccounts returns all Pages for facebook", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: "page1", name: "Page One" },
          { id: "page2", name: "Page Two", instagram_business_account: { id: "ig2" } },
        ],
      }),
    );
    const accounts = await createMetaAdapter("facebook", fetchImpl).discoverAccounts("token");
    expect(accounts).toEqual([
      { externalAccountId: "page1", externalAccountName: "Page One" },
      { externalAccountId: "page2", externalAccountName: "Page Two" },
    ]);
  });

  it("discoverAccounts filters to only Pages with a linked IG account for instagram", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: "page1", name: "Page One" },
          { id: "page2", name: "Page Two", instagram_business_account: { id: "ig2" } },
        ],
      }),
    );
    const accounts = await createMetaAdapter("instagram", fetchImpl).discoverAccounts("token");
    expect(accounts).toEqual([{ externalAccountId: "ig2", externalAccountName: "Page Two" }]);
  });
});
