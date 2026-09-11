import { getEnv } from "@/lib/env";
import { encryptSecret } from "@/lib/crypto";
import { signToken, verifyToken } from "@/lib/signed-token";
import { recordAuditLog } from "@/lib/audit";
import { IntegrationError } from "./errors";
import { createGoogleAdapter } from "./google";
import { createInstagramAdapter } from "./instagram";
import { createMetaAdapter } from "./meta";
import { deleteAccount, findAccountById, listAccounts, upsertAccount } from "./repository";
import type { Platform, ProviderAdapter } from "./types";

const STATE_PURPOSE = "integrations.oauth_state";

function getAdapter(platform: Platform): ProviderAdapter {
  if (platform === "facebook") {
    return createMetaAdapter();
  }
  if (platform === "instagram") {
    return createInstagramAdapter();
  }
  if (platform === "youtube") {
    return createGoogleAdapter();
  }
  throw new IntegrationError("PROVIDER_ERROR", `${platform} is not connectable yet.`);
}

function buildRedirectUri(platform: Platform): string {
  return `${getEnv().APP_URL}/api/integrations/${platform}/callback`;
}

export function initiateConnection(
  userId: string,
  platform: Platform,
): { authorizationUrl: string } {
  const adapter = getAdapter(platform);
  const state = signToken(STATE_PURPOSE, { userId, platform });
  return { authorizationUrl: adapter.buildAuthorizationUrl(state, buildRedirectUri(platform)) };
}

export async function completeConnection(
  userId: string,
  platform: Platform,
  code: string,
  state: string,
) {
  const statePayload = verifyToken<{ userId: string; platform: string }>(STATE_PURPOSE, state);
  if (!statePayload || statePayload.userId !== userId || statePayload.platform !== platform) {
    throw new IntegrationError(
      "INVALID_STATE",
      "This connection request is invalid or has expired.",
    );
  }

  const adapter = getAdapter(platform);
  const redirectUri = buildRedirectUri(platform);

  let exchanged;
  try {
    exchanged = await adapter.exchangeCode(code, redirectUri);
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError(
      "TOKEN_EXCHANGE_FAILED",
      "Could not exchange the authorization code.",
      error,
    );
  }

  const discovered = await adapter.discoverAccounts(exchanged.accessToken);
  if (discovered.length === 0) {
    throw new IntegrationError(
      "PROVIDER_ERROR",
      `No connectable ${platform} account was found for that login.`,
    );
  }

  const accessTokenEncrypted = encryptSecret(exchanged.accessToken);
  const refreshTokenEncrypted = exchanged.refreshToken
    ? encryptSecret(exchanged.refreshToken)
    : undefined;

  const accounts = await Promise.all(
    discovered.map(async (account) => {
      const saved = await upsertAccount({
        userId,
        platform,
        externalAccountId: account.externalAccountId,
        externalAccountName: account.externalAccountName,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        scopes: exchanged.scopes,
        tokenExpiresAt: exchanged.expiresAt,
      });
      await recordAuditLog({
        userId,
        action: "integration.connect",
        entityType: "social_account",
        entityId: saved.id,
        metadata: { platform, externalAccountName: account.externalAccountName },
      });
      return saved;
    }),
  );

  return accounts;
}

export async function disconnectAccount(userId: string, accountId: string): Promise<void> {
  const account = await findAccountById(accountId);
  if (!account)
    throw new IntegrationError("ACCOUNT_NOT_FOUND", "That connected account doesn't exist.");
  if (account.userId !== userId) {
    throw new IntegrationError("FORBIDDEN", "That connected account doesn't belong to you.");
  }

  await deleteAccount(accountId);
  await recordAuditLog({
    userId,
    action: "integration.disconnect",
    entityType: "social_account",
    entityId: accountId,
    metadata: { platform: account.platform },
  });
}

export { listAccounts };
