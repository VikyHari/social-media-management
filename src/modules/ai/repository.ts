import { getDb } from "@/lib/db";
import type { AiModel } from "./models";

export function createConversation(input: { userId: string; purpose: string; title?: string }) {
  return getDb().aiConversation.create({
    data: { userId: input.userId, purpose: input.purpose, title: input.title },
  });
}

export function appendMessage(input: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
}) {
  return getDb().aiMessage.create({
    data: { conversationId: input.conversationId, role: input.role, content: input.content },
  });
}

export function listMessages(conversationId: string) {
  return getDb().aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export function getConversation(id: string) {
  return getDb().aiConversation.findUnique({ where: { id } });
}

export function recordUsage(input: {
  userId: string;
  conversationId?: string;
  purpose: string;
  model: AiModel;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number | null;
  latencyMs: number;
}) {
  return getDb().aiUsageLog.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId,
      purpose: input.purpose,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      latencyMs: input.latencyMs,
    },
  });
}
