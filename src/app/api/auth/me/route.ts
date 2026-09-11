import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api";
import { getCurrentUser, getSessionToken } from "@/modules/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(getSessionToken(request));
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
