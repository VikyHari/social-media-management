import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as me } from "./me/route";
import { POST as signup } from "./signup/route";

// End-to-end coverage of the actual route handlers (not just the service layer):
// signup -> authenticated /me -> logout -> /me now rejected, plus a separate login flow.
const createdUserIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await getDb().user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

function postJson(path: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function getWithCookie(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: cookie ? { cookie } : {},
  });
}

describe("auth HTTP routes", () => {
  it("signup -> me -> logout -> me is rejected", async () => {
    const email = `route-${randomUUID()}@example.com`;

    const signupRes = await signup(
      postJson("/api/auth/signup", { email, password: "Sup3rSecret!" }),
    );
    expect(signupRes.status).toBe(201);
    const signupBody = await signupRes.json();
    createdUserIds.push(signupBody.user.id);
    const cookie = signupRes.cookies.get("session")?.value;
    expect(cookie).toBeTruthy();

    const meRes = await me(getWithCookie("/api/auth/me", `session=${cookie}`));
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).user.id).toBe(signupBody.user.id);

    const logoutRes = await logout(postJson("/api/auth/logout", {}, `session=${cookie}`));
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await me(getWithCookie("/api/auth/me", `session=${cookie}`));
    expect(meAfterLogout.status).toBe(401);
  });

  it("rejects signup with a malformed body", async () => {
    const res = await signup(
      postJson("/api/auth/signup", { email: "not-an-email", password: "x" }),
    );
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials via the HTTP route", async () => {
    const email = `route-${randomUUID()}@example.com`;
    const signupRes = await signup(
      postJson("/api/auth/signup", { email, password: "Sup3rSecret!" }),
    );
    createdUserIds.push((await signupRes.json()).user.id);

    const loginRes = await login(postJson("/api/auth/login", { email, password: "Sup3rSecret!" }));
    expect(loginRes.status).toBe(200);
    expect(loginRes.cookies.get("session")?.value).toBeTruthy();
  });

  it("rejects login with the wrong password via the HTTP route", async () => {
    const email = `route-${randomUUID()}@example.com`;
    const signupRes = await signup(
      postJson("/api/auth/signup", { email, password: "Sup3rSecret!" }),
    );
    createdUserIds.push((await signupRes.json()).user.id);

    const loginRes = await login(postJson("/api/auth/login", { email, password: "wrong" }));
    expect(loginRes.status).toBe(401);
  });

  it("/me without a session cookie is rejected", async () => {
    const res = await me(getWithCookie("/api/auth/me"));
    expect(res.status).toBe(401);
  });
});
