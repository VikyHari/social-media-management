import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { POST as signup } from "../auth/signup/route";
import { GET as listAccounts } from "./route";
import { GET as startConnection } from "./[platform]/start/route";
import { DELETE as disconnectAccount } from "./accounts/[accountId]/route";

// Exercises the actual route handlers for auth wiring and status codes.
// META_APP_ID/SECRET are unset in this environment (see project-state.md),
// so the start route's MISSING_CREDENTIALS path is what's verified here —
// a real authorization redirect needs real Meta app credentials.
const createdUserIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await getDb().user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

function postJson(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getWithCookie(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: cookie ? { cookie } : {},
  });
}

async function signUpAndGetCookie() {
  const email = `integration-route-${randomUUID()}@example.com`;
  const res = await signup(postJson("/api/auth/signup", { email, password: "Sup3rSecret!" }));
  const body = await res.json();
  createdUserIds.push(body.user.id);
  return `session=${res.cookies.get("session")?.value}`;
}

describe("integrations routes", () => {
  it("list, start, and disconnect all require authentication", async () => {
    expect((await listAccounts(getWithCookie("/api/integrations"))).status).toBe(401);
    expect(
      (
        await startConnection(getWithCookie("/api/integrations/facebook/start"), {
          params: Promise.resolve({ platform: "facebook" }),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await disconnectAccount(
          new NextRequest("http://localhost/api/integrations/accounts/x", { method: "DELETE" }),
          { params: Promise.resolve({ accountId: "x" }) },
        )
      ).status,
    ).toBe(401);
  });

  it("returns an empty list for a freshly signed-up user", async () => {
    const cookie = await signUpAndGetCookie();
    const res = await listAccounts(getWithCookie("/api/integrations", cookie));
    expect(res.status).toBe(200);
    expect((await res.json()).accounts).toEqual([]);
  });

  it("start fails clearly when the Meta app isn't configured (no META_APP_ID in this env)", async () => {
    const cookie = await signUpAndGetCookie();
    const res = await startConnection(getWithCookie("/api/integrations/facebook/start", cookie), {
      params: Promise.resolve({ platform: "facebook" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/META_APP_ID/);
  });

  it("start rejects an unknown platform", async () => {
    const cookie = await signUpAndGetCookie();
    const res = await startConnection(
      getWithCookie("/api/integrations/not-a-platform/start", cookie),
      {
        params: Promise.resolve({ platform: "not-a-platform" }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("disconnect returns 404 for an account that doesn't exist", async () => {
    const cookie = await signUpAndGetCookie();
    const res = await disconnectAccount(
      new NextRequest("http://localhost/api/integrations/accounts/nope", {
        method: "DELETE",
        headers: { cookie },
      }),
      { params: Promise.resolve({ accountId: randomUUID() }) },
    );
    expect(res.status).toBe(404);
  });
});
