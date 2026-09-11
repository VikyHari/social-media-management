import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, parseJsonBody } from "@/lib/api";
import { getCurrentUser, getSessionToken } from "@/modules/auth";
import {
  continueInterview,
  continueInterviewSchema,
  CreatorError,
  startInterview,
} from "@/modules/creator";

async function requireUser(request: NextRequest) {
  const user = await getCurrentUser(getSessionToken(request));
  if (!user) throw new CreatorError("FORBIDDEN", "Not authenticated.");
  return user;
}

/** Starts a new onboarding interview and returns the first question. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const step = await startInterview(user.id);
    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    if (error instanceof CreatorError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return apiErrorResponse(error);
  }
}

/** Sends the creator's answer and returns the next question, or the finished profile. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const input = await parseJsonBody(request, continueInterviewSchema);
    const step = await continueInterview(user.id, input.conversationId, input.message);
    return NextResponse.json(step);
  } catch (error) {
    if (error instanceof CreatorError) {
      const status = error.code === "FORBIDDEN" ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return apiErrorResponse(error);
  }
}
