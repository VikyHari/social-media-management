import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api";
import { getCurrentUser, getSessionToken } from "@/modules/auth";
import { listAccounts } from "@/modules/integrations";

export const dynamic = "force-dynamic";

/** Every social account the logged-in creator has connected. Never returns tokens. */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(getSessionToken(request));
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const accounts = await listAccounts(user.id);
    return NextResponse.json({ accounts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
