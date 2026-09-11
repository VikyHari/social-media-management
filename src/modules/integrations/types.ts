import { z } from "zod";

/**
 * Instagram and Facebook are one provider here on purpose: the Instagram
 * Graph API is accessed through a Facebook Login / Graph API OAuth flow
 * against a single Meta app (Part 25) — there is no separate "Instagram
 * OAuth". `platform` still distinguishes them because a creator connects
 * and manages each asset (an IG Business account, a Facebook Page, a
 * YouTube channel) independently.
 */
export const PLATFORMS = ["instagram", "facebook", "youtube"] as const;
export const platformSchema = z.enum(PLATFORMS);
export type Platform = z.infer<typeof platformSchema>;

export const ACCOUNT_STATUSES = ["connected", "expired", "revoked", "error"] as const;
export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

/** What a provider adapter (meta.ts, google.ts) returns after a successful token exchange. */
export interface ExchangedToken {
  accessToken: string;
  refreshToken?: string;
  /** undefined if the provider didn't report an expiry. */
  expiresAt?: Date;
  scopes: string[];
}

/** One connectable asset discovered for the authenticated provider identity. */
export interface DiscoveredAccount {
  externalAccountId: string;
  externalAccountName?: string;
}

/**
 * The seam every provider (Meta, Google, ...) implements. `service.ts`
 * orchestrates against this interface so it never needs to know which
 * provider it's talking to (D-0xx once recorded).
 */
export interface ProviderAdapter {
  platform: Platform;
  buildAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<ExchangedToken>;
  /** The account(s) this token grants access to (e.g. Facebook Pages + linked IG accounts). */
  discoverAccounts(accessToken: string): Promise<DiscoveredAccount[]>;
}
