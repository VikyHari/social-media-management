import { getEnv } from "@/lib/env";
import { IntegrationError } from "./errors";
import type { DiscoveredAccount, ExchangedToken, Platform, ProviderAdapter } from "./types";

/**
 * Meta (Instagram + Facebook) via one Meta app and one Facebook Login OAuth
 * flow — the Instagram Graph API has no separate OAuth of its own; Instagram
 * Business accounts are discovered through the Facebook Page they're linked
 * to (Part 25). NOT live-verified against a real Meta app — see
 * .ai/known-issues.md / project-state.md. Before relying on this in
 * production, verify against https://developers.facebook.com/docs/graph-api/changelog:
 *   - GRAPH_API_VERSION is current
 *   - SCOPES match Instagram/Facebook's current permissions reference for the
 *     metrics Part 26 needs (followers, reach, views, engagement, ...)
 */
const GRAPH_API_VERSION = "v21.0"; // verify — Graph API versions retire on a schedule
const AUTH_BASE = "https://www.facebook.com";
const GRAPH_BASE = "https://graph.facebook.com";

const SCOPES: Record<"facebook" | "instagram", string[]> = {
  facebook: ["pages_show_list", "pages_read_engagement", "pages_manage_metadata", "public_profile"],
  instagram: [
    "pages_show_list",
    "instagram_basic",
    "instagram_manage_insights",
    "pages_read_engagement",
  ],
};

interface MetaCredentials {
  appId: string;
  appSecret: string;
}

function getCredentials(): MetaCredentials {
  const env = getEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new IntegrationError(
      "MISSING_CREDENTIALS",
      "META_APP_ID / META_APP_SECRET are not set. Add them to .env to connect Instagram or Facebook.",
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
 * @param platform "facebook" or "instagram" — same app/flow, different scopes
 * and discovery step. @param fetchImpl injectable for tests; defaults to the
 * global fetch.
 */
export function createMetaAdapter(
  platform: "facebook" | "instagram",
  fetchImpl: typeof fetch = fetch,
): ProviderAdapter {
  return {
    platform: platform as Platform,

    buildAuthorizationUrl(state: string, redirectUri: string): string {
      const { appId } = getCredentials();
      const url = new URL(`${AUTH_BASE}/${GRAPH_API_VERSION}/dialog/oauth`);
      url.searchParams.set("client_id", appId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("scope", SCOPES[platform].join(","));
      url.searchParams.set("response_type", "code");
      return url.toString();
    },

    async exchangeCode(code: string, redirectUri: string): Promise<ExchangedToken> {
      const { appId, appSecret } = getCredentials();

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
        scopes: SCOPES[platform],
        expiresAt: longLived.expires_in
          ? new Date(Date.now() + longLived.expires_in * 1000)
          : undefined,
      };
    },

    async discoverAccounts(accessToken: string): Promise<DiscoveredAccount[]> {
      const pagesUrl = new URL(`${GRAPH_BASE}/${GRAPH_API_VERSION}/me/accounts`);
      pagesUrl.searchParams.set("access_token", accessToken);
      pagesUrl.searchParams.set("fields", "id,name,instagram_business_account");

      const pages = await parseGraphResponse<{
        data: Array<{ id: string; name: string; instagram_business_account?: { id: string } }>;
      }>(await fetchImpl(pagesUrl.toString()), "list Pages");

      if (platform === "facebook") {
        return pages.data.map((page) => ({
          externalAccountId: page.id,
          externalAccountName: page.name,
        }));
      }

      // instagram: only Pages with a linked IG Business account are connectable.
      return pages.data
        .filter((page) => page.instagram_business_account)
        .map((page) => ({
          externalAccountId: page.instagram_business_account!.id,
          externalAccountName: page.name,
        }));
    },
  };
}
