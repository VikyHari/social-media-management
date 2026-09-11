import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { AuthError } from "./errors";
import { getCurrentUser, logIn, logOut, signUp } from "./service";

// Integration tests against the real local Postgres (docker-compose db, port
// 5440). Each test uses a unique email so runs never collide; created users
// are cleaned up in afterAll via cascading delete (Session -> User).
const createdUserIds: string[] = [];

function uniqueEmail(): string {
  return `test-${randomUUID()}@example.com`;
}

afterAll(async () => {
  const db = getDb();
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

describe("auth service", () => {
  it("signs up a new user and returns a session token", async () => {
    const email = uniqueEmail();
    const result = await signUp({ email, password: "Sup3rSecret!", name: "Ada" });
    createdUserIds.push(result.user.id);

    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("Ada");
    expect(result.token).toEqual(expect.any(String));
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("rejects signup with an email that is already taken", async () => {
    const email = uniqueEmail();
    const first = await signUp({ email, password: "Sup3rSecret!" });
    createdUserIds.push(first.user.id);

    await expect(signUp({ email, password: "Different1!" })).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });
  });

  it("logs in with correct credentials", async () => {
    const email = uniqueEmail();
    const signedUp = await signUp({ email, password: "Sup3rSecret!" });
    createdUserIds.push(signedUp.user.id);

    const result = await logIn({ email, password: "Sup3rSecret!" });
    expect(result.user.id).toBe(signedUp.user.id);
    expect(result.token).not.toBe(signedUp.token); // a fresh session per login
  });

  it("rejects login with a wrong password", async () => {
    const email = uniqueEmail();
    const signedUp = await signUp({ email, password: "Sup3rSecret!" });
    createdUserIds.push(signedUp.user.id);

    await expect(logIn({ email, password: "wrong-password" })).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects login for an email that doesn't exist", async () => {
    await expect(logIn({ email: uniqueEmail(), password: "whatever1" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("resolves the current user from a valid session token", async () => {
    const email = uniqueEmail();
    const signedUp = await signUp({ email, password: "Sup3rSecret!" });
    createdUserIds.push(signedUp.user.id);

    const user = await getCurrentUser(signedUp.token);
    expect(user?.id).toBe(signedUp.user.id);
  });

  it("returns null for a missing or bogus token", async () => {
    await expect(getCurrentUser(undefined)).resolves.toBeNull();
    await expect(getCurrentUser("not-a-real-token")).resolves.toBeNull();
  });

  it("invalidates the session on logout", async () => {
    const email = uniqueEmail();
    const signedUp = await signUp({ email, password: "Sup3rSecret!" });
    createdUserIds.push(signedUp.user.id);

    await logOut(signedUp.token);
    const user = await getCurrentUser(signedUp.token);
    expect(user).toBeNull();
  });

  it("logging out an already-invalid token does not throw", async () => {
    await expect(logOut("never-issued-token")).resolves.toBeUndefined();
  });
});
