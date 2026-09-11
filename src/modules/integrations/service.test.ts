import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { IntegrationError } from "./errors";

const { createMetaAdapter, createGoogleAdapter, createInstagramAdapter } = vi.hoisted(() => ({
  createMetaAdapter: vi.fn(),
  createGoogleAdapter: vi.fn(),
  createInstagramAdapter: vi.fn(),
}));
vi.mock("./meta", () => ({ createMetaAdapter }));
vi.mock("./google", () => ({ createGoogleAdapter }));
vi.mock("./instagram", () => ({ createInstagramAdapter }));

import { completeConnection, disconnectAccount, initiateConnection, listAccounts } from "./service";

function stubAdapter(overrides: Partial<ReturnType<typeof buildAdapter>> = {}) {
  const adapter = buildAdapter(overrides);
  createMetaAdapter.mockReturnValue(adapter);
  return adapter;
}

function buildAdapter(overrides: Record<string, unknown> = {}) {
  return {
    platform: "facebook",
    buildAuthorizationUrl: vi.fn(() => "https://facebook.example/oauth?mock=1"),
    exchangeCode: vi
      .fn()
      .mockResolvedValue({ accessToken: "real-access-token", scopes: ["pages_show_list"] }),
    discoverAccounts: vi
      .fn()
      .mockResolvedValue([{ externalAccountId: "page1", externalAccountName: "My Page" }]),
    ...overrides,
  };
}

let userId: string;

beforeAll(async () => {
  const user = await getDb().user.create({
    data: { email: `integration-test-${randomUUID()}@example.com`, passwordHash: "unused" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (userId) await getDb().user.delete({ where: { id: userId } });
});

beforeEach(() => {
  createMetaAdapter.mockReset();
  createGoogleAdapter.mockReset();
  createInstagramAdapter.mockReset();
});

describe("initiateConnection", () => {
  it("returns an authorization url from the adapter", () => {
    stubAdapter();
    const { authorizationUrl } = initiateConnection(userId, "facebook");
    expect(authorizationUrl).toBe("https://facebook.example/oauth?mock=1");
  });

  it("routes youtube to the Google adapter, not the Meta one", () => {
    createGoogleAdapter.mockReturnValue(
      buildAdapter({
        platform: "youtube",
        buildAuthorizationUrl: vi.fn(() => "https://google.example/oauth?mock=1"),
      }),
    );
    const { authorizationUrl } = initiateConnection(userId, "youtube");
    expect(authorizationUrl).toBe("https://google.example/oauth?mock=1");
    expect(createMetaAdapter).not.toHaveBeenCalled();
  });

  it("routes instagram to its own standalone adapter, not the Meta (Facebook) one", () => {
    createInstagramAdapter.mockReturnValue(
      buildAdapter({
        platform: "instagram",
        buildAuthorizationUrl: vi.fn(() => "https://instagram.example/oauth?mock=1"),
      }),
    );
    const { authorizationUrl } = initiateConnection(userId, "instagram");
    expect(authorizationUrl).toBe("https://instagram.example/oauth?mock=1");
    expect(createMetaAdapter).not.toHaveBeenCalled();
  });
});

describe("completeConnection", () => {
  it("verifies state, exchanges the code, encrypts the token, and upserts discovered accounts", async () => {
    stubAdapter();
    // initiateConnection doesn't expose the raw state it signs, so sign one the same way here.
    const { signToken } = await import("@/lib/signed-token");
    const state = signToken("integrations.oauth_state", { userId, platform: "facebook" });

    const accounts = await completeConnection(userId, "facebook", "auth-code", state);

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ platform: "facebook", externalAccountId: "page1" });
    expect(decryptSecret(accounts[0]!.accessTokenEncrypted)).toBe("real-access-token");

    const auditRows = await getDb().auditLog.findMany({
      where: { userId, action: "integration.connect" },
    });
    expect(auditRows).toHaveLength(1);

    await getDb().socialAccount.deleteMany({ where: { userId } });
  });

  it("rejects a state token issued for a different user", async () => {
    stubAdapter();
    const { signToken } = await import("@/lib/signed-token");
    const otherUsersState = signToken("integrations.oauth_state", {
      userId: "someone-else",
      platform: "facebook",
    });

    await expect(
      completeConnection(userId, "facebook", "auth-code", otherUsersState),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("rejects a garbage state token", async () => {
    stubAdapter();
    await expect(
      completeConnection(userId, "facebook", "auth-code", "not-a-real-state"),
    ).rejects.toBeInstanceOf(IntegrationError);
  });
});

describe("disconnectAccount", () => {
  it("deletes the account and logs it, but only for its owner", async () => {
    stubAdapter();
    const { signToken } = await import("@/lib/signed-token");
    const state = signToken("integrations.oauth_state", { userId, platform: "facebook" });
    const [account] = await completeConnection(userId, "facebook", "auth-code", state);

    const otherUser = await getDb().user.create({
      data: { email: `integration-other-${randomUUID()}@example.com`, passwordHash: "unused" },
    });
    await expect(disconnectAccount(otherUser.id, account!.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await disconnectAccount(userId, account!.id);
    expect(await getDb().socialAccount.findUnique({ where: { id: account!.id } })).toBeNull();

    const auditRows = await getDb().auditLog.findMany({
      where: { userId, action: "integration.disconnect" },
    });
    expect(auditRows).toHaveLength(1);

    await getDb().user.delete({ where: { id: otherUser.id } });
  });

  it("rejects disconnecting an account that doesn't exist", async () => {
    await expect(disconnectAccount(userId, randomUUID())).rejects.toMatchObject({
      code: "ACCOUNT_NOT_FOUND",
    });
  });
});

describe("listAccounts", () => {
  it("never includes encrypted token fields", async () => {
    stubAdapter();
    const { signToken } = await import("@/lib/signed-token");
    const state = signToken("integrations.oauth_state", { userId, platform: "facebook" });
    await completeConnection(userId, "facebook", "auth-code", state);

    const accounts = await listAccounts(userId);
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0]).not.toHaveProperty("accessTokenEncrypted");

    await getDb().socialAccount.deleteMany({ where: { userId } });
  });
});
