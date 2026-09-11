import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import {
  addAssistantMessage,
  addUserMessage,
  getConversation,
  getConversationHistory,
  startConversation,
} from "./conversation";
import { logUsage } from "./usage";
import { AI_MODELS } from "./models";

// Integration tests against the real local Postgres, mirroring
// src/modules/auth/service.test.ts's pattern: a throwaway user, unique data,
// cleanup in afterAll (cascades to conversations/messages/usage logs).
let userId: string;

beforeAll(async () => {
  const user = await getDb().user.create({
    data: { email: `ai-test-${randomUUID()}@example.com`, passwordHash: "unused" },
  });
  userId = user.id;
});

afterAll(async () => {
  if (userId) await getDb().user.delete({ where: { id: userId } });
});

describe("conversation", () => {
  it("creates a conversation and appends messages in order", async () => {
    const conversation = await startConversation(userId, "onboarding", "First chat");
    expect(conversation.userId).toBe(userId);
    expect(conversation.purpose).toBe("onboarding");

    await addUserMessage(conversation.id, "What niche should I focus on?");
    await addAssistantMessage(conversation.id, "Tell me about your interests first.");

    const history = await getConversationHistory(conversation.id);
    expect(history.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(history[0]?.content).toBe("What niche should I focus on?");
  });

  it("fetches a conversation by id", async () => {
    const created = await startConversation(userId, "chat");
    const fetched = await getConversation(created.id);
    expect(fetched?.id).toBe(created.id);
  });
});

describe("logUsage", () => {
  it("records a usage row without throwing", async () => {
    await expect(
      logUsage({
        userId,
        purpose: "test.usage",
        model: AI_MODELS.sonnet,
        inputTokens: 120,
        outputTokens: 45,
        latencyMs: 850,
      }),
    ).resolves.toBeUndefined();

    const rows = await getDb().aiUsageLog.findMany({ where: { userId, purpose: "test.usage" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ inputTokens: 120, outputTokens: 45 });
    // No verified pricing configured yet (see pricing.ts) — must stay null, not a guess.
    expect(rows[0]?.estimatedCostUsd).toBeNull();
  });
});
