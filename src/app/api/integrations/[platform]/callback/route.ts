import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { getCurrentUser, getSessionToken } from "@/modules/auth";
import { completeConnection, IntegrationError, platformSchema } from "@/modules/integrations";

/**
 * The provider redirects the browser back here with ?code&state after the
 * creator approves the connection. Redirects home with a status query param
 * — there's no dedicated integrations page yet (Phase 2 is backend-first).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const appUrl = getEnv().APP_URL;
  const user = await getCurrentUser(getSessionToken(request));
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const parsedPlatform = platformSchema.safeParse((await params).platform);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      `${appUrl}/?integration_error=${encodeURIComponent(providerError)}`,
    );
  }
  if (!parsedPlatform.success || !code || !state) {
    return NextResponse.json({ error: "Missing or invalid callback parameters." }, { status: 400 });
  }

  try {
    await completeConnection(user.id, parsedPlatform.data, code, state);
    return NextResponse.redirect(`${appUrl}/?connected=${parsedPlatform.data}`);
  } catch (error) {
    const message = error instanceof IntegrationError ? error.message : "connection_failed";
    console.error("[api/integrations/callback]", error);
    return NextResponse.redirect(`${appUrl}/?integration_error=${encodeURIComponent(message)}`);
  }
}
