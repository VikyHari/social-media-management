import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getSessionToken } from "@/modules/auth";
import { IntegrationError, initiateConnection, platformSchema } from "@/modules/integrations";

/** Redirects the browser to the provider's consent screen. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const user = await getCurrentUser(getSessionToken(request));
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const parsedPlatform = platformSchema.safeParse((await params).platform);
  if (!parsedPlatform.success) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
  }

  try {
    const { authorizationUrl } = initiateConnection(user.id, parsedPlatform.data);
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/integrations/start]", error);
    return NextResponse.json({ error: "Could not start the connection." }, { status: 500 });
  }
}
