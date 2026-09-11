import { getEnv } from "@/lib/env";
import { IntegrationError } from "./errors";
import type { DiscoveredAccount, ExchangedToken, ProviderAdapter } from "./types";

/**
 * Facebook Login for Business — Facebook Pages only. Instagram is a
 * SEPARATE, standalone OAuth flow now (see instagram.ts, D-017) — it used
 * to be reached through this same Facebook flow (the old
 * instagram_business_account lookup on a Page), but that approach's scopes
 * were deprecated; Instagram Business Login is Meta's current path and does
 * not need a Facebook Page at all.
 *
 * NOT live-verified against a real Meta app — see .ai/known-issues.md /
 * project-state.md. GRAPH_API_VERSION/SCOPES were checked against Meta's
 * docs on 2026-09-11; verify again at
 * https://developers.facebook.com/docs/graph-api/changelog before relying
 * on this for real, since Graph API versions retire on a schedule.
 */
const GRAPH_API_VERSION = "v26.0";
const AUTH_BASE = "https://www.facebook.com";
const GRAPH_BASE = "https://graph.facebook.com";
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "public_profile",
];

interface MetaCredentials {
  appId: string;
  appSecret: string;
}

/**
 * @param override injectable for tests, so they never need to mutate
 * process.env (a prior version of these tests did, and it caused an
 * intermittent cross-file race under Vitest's parallel workers — see
 * BUG #002/#004). Defaults to reading from the real environment.
 */
function getCredentials(override?: MetaCredentials): MetaCredentials {
  if (override) return override;
  const env = getEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new IntegrationError(
      "MISSING_CREDENTIALS",
      "META_APP_ID / META_APP_SECRET are not set. Add them to .env to connect Facebook.",
    );
  }
  return { appId: env.META_APP_ID, appSecret: env.META_APP_SECRET };
}

async function parseGraphResponse<T>(response: Response, context: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    (T & { error?: { message?: string } }) | null;
  if (!response.ok || !body) {
    throw new IntegrationError(
      "PROVIDER_ERROR",
      `Meta Graph API request failed (${context}): ${body?.error?.message ?? response.statusText}`,
    );
  }
  return body;
}

/**
 * @param fetchImpl injectable for tests; defaults to the global fetch.
 * @param credentials injectable for tests; defaults to reading META_APP_ID/SECRET from env.
 */
export function createMetaAdapter(
  fetchImpl: typeof fetch = fetch,
  credentials?: MetaCredentials,
): ProviderAdapter {
  return {
    platform: "facebook",

    buildAuthorizationUrl(state: string, redirectUri: string): string {
      const { appId } = getCredentials(credentials);
      const url = new URL(`${AUTH_BASE}/${GRAPH_API_VERSION}/dialog/oauth`);
      url.searchParams.set("client_id", appId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("scope", SCOPES.join(","));
      url.searchParams.set("response_type", "code");
      return url.toString();
    },

    async exchangeCode(code: string, redirectUri: string): Promise<ExchangedToken> {
      const { appId, appSecret } = getCredentials(credentials);

      const shortLivedUrl = new URL(`${GRAPH_BASE}/${GRAPH_API_VERSION}/oauth/access_token`);
      shortLivedUrl.searchParams.set("client_id", appId);
      shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
      shortLivedUrl.searchParams.set("client_secret", appSecret);
      shortLivedUrl.searchParams.set("code", code);

      const shortLived = await parseGraphResponse<{ access_token: string; expires_in?: number }>(
        await fetchImpl(shortLivedUrl.toString()),
        "short-lived token exchange",
      );

      // Meta short-lived tokens last ~1-2h; exchange for a long-lived (~60 day) one.
      const longLivedUrl = new URL(`${GRAPH_BASE}/${GRAPH_API_VERSION}/oauth/access_token`);
      longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
      longLivedUrl.searchParams.set("client_id", appId);
      longLivedUrl.searchParams.set("client_secret", appSecret);
      longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

      const longLived = await parseGraphResponse<{ access_token: string; expires_in?: number }>(
        await fetchImpl(longLivedUrl.toString()),
        "long-lived token exchange",
      );

      return {
        accessToken: longLived.access_token,
        scopes: SCOPES,
        expiresAt: longLived.expires_in
          ? new Date(Date.now() + longLived.expires_in * 1000)
          : undefined,
      };
    },

    async discoverAccounts(accessToken: string): Promise<DiscoveredAccount[]> {
      const pagesUrl = new URL(`${GRAPH_BASE}/${GRAPH_API_VERSION}/me/accounts`);
      pagesUrl.searchParams.set("access_token", accessToken);
      pagesUrl.searchParams.set("fields", "id,name");

      const pages = await parseGraphResponse<{ data: Array<{ id: string; name: string }> }>(
        await fetchImpl(pagesUrl.toString()),
        "list Pages",
      );

      return pages.data.map((page) => ({
        externalAccountId: page.id,
        externalAccountName: page.name,
      }));
    },
  };
}
