import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/audit";
import { apiErrorResponse, parseJsonBody } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { AuthError, loginSchema, logIn, setSessionCookie } from "@/modules/auth";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "unknown";
  const limit = checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const input = await parseJsonBody(request, loginSchema);
    const result = await logIn(input, {
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: ip,
    });

    const response = NextResponse.json({ user: result.user }, { status: 200 });
    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return apiErrorResponse(error);
  }
}
