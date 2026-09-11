import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";

const { generateStructured } = vi.hoisted(() => ({ generateStructured: vi.fn() }));

vi.mock("@/modules/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/ai")>();
  return { ...actual, generateStructured };
});

import { POST as signup } from "../auth/signup/route";
import { POST as startOnboarding, PATCH as continueOnboarding } from "./onboarding/route";
import { GET as getProfile } from "./profile/route";

// Exercises the actual HTTP route handlers (auth + creator together), the
// same way src/app/api/auth/auth.route.test.ts does for auth alone.
const createdUserIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await getDb().user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

beforeEach(() => {
  generateStructured.mockReset();
});

function postJson(path: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function patchJson(path: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function getWithCookie(path: string, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: cookie ? { cookie } : {},
  });
}

async function signUpAndGetCookie() {
  const email = `creator-route-${randomUUID()}@example.com`;
  const res = await signup(postJson("/api/auth/signup", { email, password: "Sup3rSecret!" }));
  const body = await res.json();
  createdUserIds.push(body.user.id);
  return { userId: body.user.id, cookie: `session=${res.cookies.get("session")?.value}` };
}

describe("creator onboarding routes", () => {
  it("requires authentication to start an interview", async () => {
    const res = await startOnboarding(postJson("/api/creator/onboarding", {}));
    expect(res.status).toBe(401);
  });

  it("runs start -> continue -> profile for a logged-in user", async () => {
    const { cookie } = await signUpAndGetCookie();

    generateStructured.mockResolvedValueOnce({
      data: { message: "What's your niche?", readyToExtractProfile: false },
      model: "claude-sonnet-5",
      inputTokens: 10,
      outputTokens: 5,
      latencyMs: 50,
      retried: false,
    });
    const startRes = await startOnboarding(postJson("/api/creator/onboarding", {}, cookie));
    expect(startRes.status).toBe(201);
    const startBody = await startRes.json();
    expect(startBody.message).toBe("What's your niche?");

    generateStructured
      .mockResolvedValueOnce({
        data: { message: "Great, that's plenty!", readyToExtractProfile: true },
        model: "claude-sonnet-5",
        inputTokens: 10,
        outputTokens: 5,
        latencyMs: 50,
        retried: false,
      })
      .mockResolvedValueOnce({
        data: {
          primaryNiche: "cooking",
          secondaryNiches: [],
          interests: ["baking"],
          skills: ["knife skills"],
          targetAudience: "home cooks",
          platforms: ["instagram"],
          contentFormats: ["reels"],
          language: "English",
          strengths: ["fast editing"],
          weaknesses: ["camera shyness"],
          equipment: ["phone"],
          budget: "$0",
          timeAvailable: "3 hours/week",
          experienceLevel: "beginner",
          competitors: [],
          monetizationGoals: "affiliate links eventually",
          brandPositioning: "quick weeknight meals",
          goals: [{ description: "Post consistently for a month" }],
        },
        model: "claude-sonnet-5",
        inputTokens: 100,
        outputTokens: 80,
        latencyMs: 400,
        retried: false,
      });
    const continueRes = await continueOnboarding(
      patchJson(
        "/api/creator/onboarding",
        { conversationId: startBody.conversationId, message: "I cook weeknight dinners." },
        cookie,
      ),
    );
    expect(continueRes.status).toBe(200);
    const continueBody = await continueRes.json();
    expect(continueBody.done).toBe(true);
    expect(continueBody.profile.primaryNiche).toBe("cooking");

    const profileRes = await getProfile(getWithCookie("/api/creator/profile", cookie));
    expect(profileRes.status).toBe(200);
    const profileBody = await profileRes.json();
    expect(profileBody.profile.primaryNiche).toBe("cooking");
    expect(profileBody.goals).toHaveLength(1);
  });

  it("profile endpoint requires authentication", async () => {
    const res = await getProfile(getWithCookie("/api/creator/profile"));
    expect(res.status).toBe(401);
  });
});
