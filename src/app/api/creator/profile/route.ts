import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api";
import { getCurrentUser, getSessionToken } from "@/modules/auth";
import { getGoals, getProfile } from "@/modules/creator";

export const dynamic = "force-dynamic";

/** The logged-in creator's current profile and goals, or null if onboarding isn't done. */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(getSessionToken(request));
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const [profile, goals] = await Promise.all([getProfile(user.id), getGoals(user.id)]);
    return NextResponse.json({ profile, goals });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
