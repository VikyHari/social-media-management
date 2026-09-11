import { getDb } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

export function findUserByEmail(email: string): Promise<User | null> {
  return getDb().user.findUnique({ where: { email } });
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  name?: string;
}): Promise<User> {
  return getDb().user.create({
    data: { email: input.email, passwordHash: input.passwordHash, name: input.name },
  });
}

export function createSession(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
}) {
  return getDb().session.create({
    data: {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
    },
  });
}

/** Only returns a session that hasn't expired, with its owning user attached. */
export function findActiveSessionByTokenHash(tokenHash: string) {
  return getDb().session.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
}

export async function touchSession(id: string): Promise<void> {
  await getDb().session.update({ where: { id }, data: { lastSeenAt: new Date() } });
}

/** Idempotent: deleting a session that no longer exists is not an error. */
export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await getDb().session.deleteMany({ where: { tokenHash } });
}
