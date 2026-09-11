import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/api";
import { clearSessionCookie, getSessionToken, logOut } from "@/modules/auth";

export async function POST(request: NextRequest) {
  try {
    const token = getSessionToken(request);
    if (token) {
      await logOut(token, { ipAddress: getClientIp(request) });
    }
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
