import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { EXTRACT_PROFILE_TOOL } from "./prompts";
import { getGoals, getProfile } from "./profile";
import { CreatorError } from "./errors";

// vi.hoisted: vi.mock factories are hoisted above all imports, so a plain
// module-level `const generateStructured = vi.fn()` would be read before
// it's initialized. vi.hoisted lifts the declaration itself to the same spot.
const { generateStructured } = vi.hoisted(() => ({ generateStructured: vi.fn() }));

vi.mock("@/modules/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/ai")>();
  return { ...actual, generateStructured };
});

import { continueInterview, startInterview } from "./interview";

function interviewResponse(message: string, readyToExtractProfile: boolean) {
  return {
    data: { message, readyToExtractProfile },
    model: "claude-sonnet-5",
    inputTokens: 40,
    outputTokens: 15,
    latencyMs: 120,
    retried: false,
  };
}

const validExtraction = {
  primaryNiche: "woodworking",
  secondaryNiches: ["DIY furniture"],
  interests: ["hand tools"],
  skills: ["joinery"],
  targetAudience: "beginner woodworkers aged 25-45",
  platforms: ["youtube", "instagram"],
  contentFormats: ["long-form tutorials", "reels"],
  language: "English",
  strengths: ["clear explanations"],
  weaknesses: ["inconsistent posting"],
  equipment: ["table saw", "phone camera"],
  budget: "$100/month",
  timeAvailable: "6 hours/week",
  experienceLevel: "intermediate" as const,
  existingContent: "12 YouTube videos",
  competitors: ["Some Woodworking Channel"],
  monetizationGoals: "Reach $500/month via sponsorships",
  brandPositioning: "The approachable woodworking teacher",
  rawNotes: undefined,
  goals: [{ description: "Hit 5,000 subscribers", category: "followers", targetValue: "5000" }],
};

function extractionResponse() {
  return {
    data: validExtraction,
    model: "claude-sonnet-5",
    inputTokens: 300,
    outputTokens: 200,
    latencyMs: 900,
    retried: false,
  };
}

let userId: string;

beforeAll(async () => {
  const user = await getDb().user.create({
    data: { email: `creator-test-${randomUUID()}@example.com`, passwordHash: "unused" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (userId) await getDb().user.delete({ where: { id: userId } });
});

beforeEach(() => {
  generateStructured.mockReset();
});

describe("startInterview", () => {
  it("creates a conversation and returns the first question", async () => {
    generateStructured.mockResolvedValue(interviewResponse("What's your niche?", false));

    const step = await startInterview(userId);

    expect(step.done).toBe(false);
    expect(step.message).toBe("What's your niche?");
    expect(step.conversationId).toEqual(expect.any(String));

    const conversation = await getDb().aiConversation.findUnique({
      where: { id: step.conversationId },
    });
    expect(conversation?.purpose).toBe("onboarding");
    const messages = await getDb().aiMessage.findMany({
      where: { conversationId: step.conversationId },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ role: "assistant", content: "What's your niche?" });
  });
});

describe("continueInterview", () => {
  it("appends messages and asks another question when not ready", async () => {
    generateStructured.mockResolvedValueOnce(interviewResponse("First question?", false));
    const started = await startInterview(userId);

    generateStructured.mockResolvedValueOnce(interviewResponse("Follow-up question?", false));
    const step = await continueInterview(
      userId,
      started.conversationId,
      "I make woodworking videos.",
    );

    expect(step.done).toBe(false);
    expect(step.message).toBe("Follow-up question?");

    const messages = await getDb().aiMessage.findMany({
      where: { conversationId: started.conversationId },
      orderBy: { createdAt: "asc" },
    });
    expect(messages.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
  });

  it("extracts and saves the profile + goals once ready, upserting on re-run", async () => {
    generateStructured.mockResolvedValueOnce(interviewResponse("First question?", false));
    const started = await startInterview(userId);

    generateStructured
      .mockResolvedValueOnce(interviewResponse("Great, that's enough!", true))
      .mockResolvedValueOnce(extractionResponse());

    const step = await continueInterview(
      userId,
      started.conversationId,
      "That's everything about me.",
    );

    expect(step.done).toBe(true);
    expect(step.profile).toMatchObject({ primaryNiche: "woodworking", userId });
    expect(step.goals).toHaveLength(1);
    expect(step.goals?.[0]).toMatchObject({ description: "Hit 5,000 subscribers" });

    // The extraction call used the forced-tool schema, not the interview one.
    const lastCallArgs = generateStructured.mock.calls.at(-1)?.[0];
    expect(lastCallArgs.toolName).toBe(EXTRACT_PROFILE_TOOL.name);

    const savedProfile = await getProfile(userId);
    expect(savedProfile?.primaryNiche).toBe("woodworking");
    const savedGoals = await getGoals(userId);
    expect(savedGoals).toHaveLength(1);

    // Re-running onboarding updates the same profile row rather than duplicating it.
    // Three real generateStructured calls happen below: startInterview's opening
    // question, continueInterview's ready-to-extract turn, then the extraction itself.
    generateStructured
      .mockResolvedValueOnce(interviewResponse("Let's redo this.", false))
      .mockResolvedValueOnce(interviewResponse("Got it, updating your profile.", true))
      .mockResolvedValueOnce({
        ...extractionResponse(),
        data: {
          ...validExtraction,
          primaryNiche: "landscape photography",
          goals: validExtraction.goals,
        },
      });
    const secondStarted = await startInterview(userId);
    const secondStep = await continueInterview(
      userId,
      secondStarted.conversationId,
      "Actually, new niche.",
    );

    expect(secondStep.profile?.primaryNiche).toBe("landscape photography");
    const profileCount = await getDb().creatorProfile.count({ where: { userId } });
    expect(profileCount).toBe(1); // upserted, not duplicated
  });

  it("rejects a conversation that doesn't exist", async () => {
    await expect(continueInterview(userId, randomUUID(), "hi")).rejects.toMatchObject({
      code: "CONVERSATION_NOT_FOUND",
    });
  });

  it("rejects a conversation that belongs to another user", async () => {
    const otherUser = await getDb().user.create({
      data: { email: `creator-other-${randomUUID()}@example.com`, passwordHash: "unused" },
    });
    generateStructured.mockResolvedValueOnce(interviewResponse("Q1?", false));
    const theirConversation = await startInterview(otherUser.id);

    await expect(
      continueInterview(userId, theirConversation.conversationId, "trying to hijack"),
    ).rejects.toBeInstanceOf(CreatorError);

    await getDb().user.delete({ where: { id: otherUser.id } });
  });
});
