import { getEnv } from "@/lib/env";
import { IntegrationError } from "./errors";
import type { DiscoveredAccount, ExchangedToken, ProviderAdapter } from "./types";

/**
 * Instagram Business Login — a standalone OAuth flow on Instagram's own
 * domain, NOT the old "get a Facebook Page token, then look up its linked
 * instagram_business_account" approach (that path's scopes were deprecated
 * January 27, 2025; see D-017). Does not require a Facebook Page at all.
 *
 * Uses its OWN credential pair (INSTAGRAM_APP_ID/SECRET) from the SAME Meta
 * app's dashboard (App Dashboard > Instagram > API setup with Instagram
 * login > Business login settings) — these are NOT the same values as
 * META_APP_ID/SECRET, which is now Facebook-only (meta.ts).
 *
 * NOT live-verified against a real Meta app — see .ai/known-issues.md /
 * project-state.md. Endpoints/scope confirmed against Meta's Instagram
 * Platform docs on 2026-09-11; the long-lived-token response shape and the
 * /me response shape were inferred from standard Graph API conventions
 * (flat JSON for a singular resource) rather than explicitly shown in the
 * fetched docs — verify against a real response before trusting blindly.
 */
const API_VERSION = "v25.0"; // graph.instagram.com versions independently of graph.facebook.com
const AUTH_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_EXCHANGE_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com";

// instagram_business_basic covers profile + insights (read access) — all
// this app currently needs (Part 26). Add instagram_business_content_publish
// / _manage_comments / _manage_messages only once publishing or comment
// features (Phase 7) actually use them — request the minimum needed.
const SCOPES = ["instagram_business_basic"];

interface InstagramCredentials {
  appId: string;
  appSecret: string;
}

/**
 * @param override injectable for tests, so they never need to mutate
 * process.env (see meta.ts's getCredentials for why). Defaults to reading
 * from the real environment.
 */
function getCredentials(override?: InstagramCredentials): InstagramCredentials {
  if (override) return override;
  const env = getEnv();
  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
    throw new IntegrationError(
      "MISSING_CREDENTIALS",
      "INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set. Add them to .env to connect Instagram.",
    );
  }
  return { appId: env.INSTAGRAM_APP_ID, appSecret: env.INSTAGRAM_APP_SECRET };
}

async function parseResponse<T>(response: Response, context: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    (T & { error_message?: string; error?: { message?: string } }) | null;
  if (!response.ok || !body) {
    throw new IntegrationError(
      "PROVIDER_ERROR",
      `Instagram API request failed (${context}): ${body?.error_message ?? body?.error?.message ?? response.statusText}`,
    );
  }
  return body;
}

/**
 * @param fetchImpl injectable for tests; defaults to the global fetch.
 * @param credentials injectable for tests; defaults to reading INSTAGRAM_APP_ID/SECRET from env.
 */
export function createInstagramAdapter(
  fetchImpl: typeof fetch = fetch,
  credentials?: InstagramCredentials,
): ProviderAdapter {
  return {
    platform: "instagram",

    buildAuthorizationUrl(state: string, redirectUri: string): string {
      const { appId } = getCredentials(credentials);
      const url = new URL(AUTH_URL);
      url.searchParams.set("client_id", appId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", SCOPES.join(","));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("state", state);
      return url.toString();
    },

    async exchangeCode(code: string, redirectUri: string): Promise<ExchangedToken> {
      const { appId, appSecret } = getCredentials(credentials);

      const body = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      });
      const shortLivedResponse = await fetchImpl(TOKEN_EXCHANGE_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const shortLived = await parseResponse<{
        data: Array<{ access_token: string; user_id: string; permissions?: string }>;
      }>(shortLivedResponse, "short-lived token exchange");
      const shortLivedToken = shortLived.data[0]?.access_token;
      if (!shortLivedToken) {
        throw new IntegrationError("PROVIDER_ERROR", "Instagram did not return an access token.");
      }

      // Short-lived tokens last ~1h; exchange for a long-lived (~60 day) one.
      const longLivedUrl = new URL(`${GRAPH_BASE}/access_token`);
      longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
      longLivedUrl.searchParams.set("client_secret", appSecret);
      longLivedUrl.searchParams.set("access_token", shortLivedToken);

      const longLived = await parseResponse<{ access_token: string; expires_in?: number }>(
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
      const url = new URL(`${GRAPH_BASE}/${API_VERSION}/me`);
      url.searchParams.set("fields", "user_id,username");
      url.searchParams.set("access_token", accessToken);

      const account = await parseResponse<{ user_id: string; username: string }>(
        await fetchImpl(url.toString()),
        "get account info",
      );

      return [{ externalAccountId: account.user_id, externalAccountName: account.username }];
    },
  };
}
