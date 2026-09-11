import { getDb } from "@/lib/db";
import type { Platform } from "./types";

export function upsertAccount(input: {
  userId: string;
  platform: Platform;
  externalAccountId: string;
  externalAccountName?: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  scopes: string[];
  tokenExpiresAt?: Date;
}) {
  return getDb().socialAccount.upsert({
    where: {
      userId_platform_externalAccountId: {
        userId: input.userId,
        platform: input.platform,
        externalAccountId: input.externalAccountId,
      },
    },
    create: { ...input, status: "connected", lastError: null },
    update: {
      externalAccountName: input.externalAccountName,
      accessTokenEncrypted: input.accessTokenEncrypted,
      refreshTokenEncrypted: input.refreshTokenEncrypted,
      scopes: input.scopes,
      tokenExpiresAt: input.tokenExpiresAt,
      status: "connected",
      lastError: null,
    },
  });
}

export function listAccounts(userId: string) {
  return getDb().socialAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      platform: true,
      externalAccountId: true,
      externalAccountName: true,
      status: true,
      scopes: true,
      tokenExpiresAt: true,
      lastSyncedAt: true,
      lastError: true,
      createdAt: true,
      // never select accessTokenEncrypted/refreshTokenEncrypted for API responses
    },
  });
}

export function findAccountById(id: string) {
  return getDb().socialAccount.findUnique({ where: { id } });
}

export function deleteAccount(id: string) {
  return getDb().socialAccount.delete({ where: { id } });
}
