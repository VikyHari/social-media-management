import { recordAuditLog } from "@/lib/audit";
import { SESSION_DURATION_MS } from "./cookie";
import { AuthError } from "./errors";
import { hashPassword, verifyPassword } from "./password";
import { toPublicUser, type PublicUser } from "./public-user";
import {
  createSession,
  createUser,
  deleteSessionByTokenHash,
  findActiveSessionByTokenHash,
  findUserByEmail,
  touchSession,
} from "./repository";
import type { LoginInput, SignupInput } from "./schemas";
import { generateSessionToken, hashSessionToken } from "./tokens";

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
  expiresAt: Date;
}

async function startSession(userId: string, context: RequestContext) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await createSession({ userId, tokenHash, expiresAt, userAgent: context.userAgent });
  return { token, expiresAt };
}

export async function signUp(
  input: SignupInput,
  context: RequestContext = {},
): Promise<AuthResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AuthError("EMAIL_TAKEN", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({ email: input.email, passwordHash, name: input.name });
  const session = await startSession(user.id, context);

  await recordAuditLog({ userId: user.id, action: "auth.signup", ipAddress: context.ipAddress });

  return { user: toPublicUser(user), token: session.token, expiresAt: session.expiresAt };
}

export async function logIn(input: LoginInput, context: RequestContext = {}): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);
  // Same error for "no such user" and "wrong password" so login can't be used
  // to enumerate which emails have accounts.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError("INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  const session = await startSession(user.id, context);
  await recordAuditLog({ userId: user.id, action: "auth.login", ipAddress: context.ipAddress });

  return { user: toPublicUser(user), token: session.token, expiresAt: session.expiresAt };
}

export async function logOut(rawToken: string, context: RequestContext = {}): Promise<void> {
  const tokenHash = hashSessionToken(rawToken);
  const session = await findActiveSessionByTokenHash(tokenHash);
  await deleteSessionByTokenHash(tokenHash);
  if (session) {
    await recordAuditLog({
      userId: session.userId,
      action: "auth.logout",
      ipAddress: context.ipAddress,
    });
  }
}

/** Resolves the current user from a raw session-cookie token, or null if absent/expired. */
export async function getCurrentUser(rawToken: string | undefined): Promise<PublicUser | null> {
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await findActiveSessionByTokenHash(tokenHash);
  if (!session) return null;

  // Best-effort activity tracking; must never fail the request it's attached to.
  touchSession(session.id).catch((error) => {
    console.error("[auth] failed to update session lastSeenAt", error);
  });

  return toPublicUser(session.user);
}
