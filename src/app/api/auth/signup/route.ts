import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/audit";
import { apiErrorResponse, parseJsonBody } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { AuthError, setSessionCookie, signUp, signupSchema } from "@/modules/auth";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "unknown";
  const limit = checkRateLimit(`signup:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const input = await parseJsonBody(request, signupSchema);
    const result = await signUp(input, {
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: ip,
    });

    const response = NextResponse.json({ user: result.user }, { status: 201 });
    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
