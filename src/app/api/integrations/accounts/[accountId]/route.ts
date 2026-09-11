import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api";
import { getCurrentUser, getSessionToken } from "@/modules/auth";
import { disconnectAccount, IntegrationError } from "@/modules/integrations";

/** Disconnects (deletes) one connected social account (Part 52: the user must be able to). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const user = await getCurrentUser(getSessionToken(request));
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { accountId } = await params;
    await disconnectAccount(user.id, accountId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof IntegrationError) {
      const status =
        error.code === "FORBIDDEN" ? 403 : error.code === "ACCOUNT_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return apiErrorResponse(error);
  }
}
