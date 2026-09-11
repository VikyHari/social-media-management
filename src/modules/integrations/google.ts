import { getEnv } from "@/lib/env";
import { IntegrationError } from "./errors";
import type { DiscoveredAccount, ExchangedToken, ProviderAdapter } from "./types";

/**
 * YouTube via Google OAuth 2.0 + the YouTube Data API. NOT live-verified
 * against a real Google Cloud OAuth client — see .ai/known-issues.md /
 * project-state.md. Before relying on this in production, verify against
 * https://developers.google.com/identity/protocols/oauth2 and
 * https://developers.google.com/youtube/v3/docs:
 *   - SCOPES match what's actually needed for Part 26's metrics (subscribers,
 *     views, watch time, retention, traffic sources need the YouTube Analytics
 *     API scope in addition to plain read access)
 *   - the YouTube Data API surface used in discoverAccounts is current
 *
 * Unlike Meta (long-lived-token re-exchange, D-011), Google returns a real
 * refresh_token — but only on the first consent, hence access_type=offline
 * plus prompt=consent below.
 */
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * @param override injectable for tests, so they never need to mutate
 * process.env (see meta.ts's getCredentials for why). Defaults to reading
 * from the real environment.
 */
function getCredentials(override?: GoogleCredentials): GoogleCredentials {
  if (override) return override;
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new IntegrationError(
      "MISSING_CREDENTIALS",
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set. Add them to .env to connect YouTube.",
    );
  }
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    (T & { error?: string; error_description?: string }) | null;
  if (!response.ok || !body) {
    throw new IntegrationError(
      "PROVIDER_ERROR",
      `Google API request failed (${context}): ${body?.error_description ?? body?.error ?? response.statusText}`,
    );
  }
  return body;
}

/**
 * @param fetchImpl injectable for tests; defaults to the global fetch.
 * @param credentials injectable for tests; defaults to reading GOOGLE_CLIENT_ID/SECRET from env.
 */
export function createGoogleAdapter(
  fetchImpl: typeof fetch = fetch,
  credentials?: GoogleCredentials,
): ProviderAdapter {
  return {
    platform: "youtube",

    buildAuthorizationUrl(state: string, redirectUri: string): string {
      const { clientId } = getCredentials(credentials);
      const url = new URL(AUTH_ENDPOINT);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", SCOPES.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("access_type", "offline"); // needed to receive a refresh_token
      url.searchParams.set("prompt", "consent"); // force one even on repeat authorization
      return url.toString();
    },

    async exchangeCode(code: string, redirectUri: string): Promise<ExchangedToken> {
      const { clientId, clientSecret } = getCredentials(credentials);

      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });

      const response = await fetchImpl(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const token = await parseJsonResponse<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      }>(response, "token exchange");

      return {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined,
        scopes: token.scope ? token.scope.split(" ") : SCOPES,
      };
    },

    async discoverAccounts(accessToken: string): Promise<DiscoveredAccount[]> {
      const url = new URL(`${YOUTUBE_API_BASE}/channels`);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("mine", "true");

      const response = await fetchImpl(url.toString(), {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const result = await parseJsonResponse<{
        items: Array<{ id: string; snippet?: { title?: string } }>;
      }>(response, "list channels");

      return result.items.map((item) => ({
        externalAccountId: item.id,
        externalAccountName: item.snippet?.title,
      }));
    },
  };
}
