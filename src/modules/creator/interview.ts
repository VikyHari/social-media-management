import type Anthropic from "@anthropic-ai/sdk";
import {
  addAssistantMessage,
  addUserMessage,
  generateStructured,
  getConversation,
  getConversationHistory,
  logUsage,
  startConversation,
} from "@/modules/ai";
import { CreatorError } from "./errors";
import {
  ASK_QUESTION_TOOL,
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACT_PROFILE_TOOL,
  INTERVIEW_SYSTEM_PROMPT,
} from "./prompts";
import { createGoal, upsertProfile } from "./repository";
import {
  creatorProfileExtractionSchema,
  interviewTurnSchema,
  type CreatorProfileExtraction,
} from "./schemas";

const PURPOSE = "onboarding";

export interface InterviewStep {
  conversationId: string;
  message: string;
  done: boolean;
  profile?: Awaited<ReturnType<typeof upsertProfile>>;
  goals?: Awaited<ReturnType<typeof createGoal>>[];
}

interface HistoryRow {
  role: string;
  content: string;
}

function toMessageParams(history: HistoryRow[]): Anthropic.MessageParam[] {
  return history.map((row) => ({
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
  }));
}

async function loadOwnedConversation(userId: string, conversationId: string) {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new CreatorError("CONVERSATION_NOT_FOUND", "That interview session doesn't exist.");
  }
  if (conversation.userId !== userId) {
    throw new CreatorError("FORBIDDEN", "That interview session doesn't belong to you.");
  }
  return conversation;
}

async function extractAndSaveProfile(
  userId: string,
  conversationId: string,
): Promise<{
  profile: Awaited<ReturnType<typeof upsertProfile>>;
  goals: Awaited<ReturnType<typeof createGoal>>[];
}> {
  const history = await getConversationHistory(conversationId);
  const result = await generateStructured({
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: toMessageParams(history),
    schema: creatorProfileExtractionSchema,
    toolName: EXTRACT_PROFILE_TOOL.name,
    toolDescription: EXTRACT_PROFILE_TOOL.description,
  });

  await logUsage({
    userId,
    conversationId,
    purpose: `${PURPOSE}.extract_profile`,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
  });

  const { goals: goalInputs, ...profileFields }: CreatorProfileExtraction = result.data;
  const profile = await upsertProfile({
    userId,
    sourceConversationId: conversationId,
    data: profileFields,
  });
  const goals = await Promise.all(
    goalInputs.map((goal) =>
      createGoal({
        userId,
        creatorProfileId: profile.id,
        description: goal.description,
        category: goal.category,
        targetValue: goal.targetValue,
      }),
    ),
  );

  return { profile, goals };
}

export async function startInterview(userId: string): Promise<InterviewStep> {
  const conversation = await startConversation(userId, PURPOSE, "Creator onboarding");

  const result = await generateStructured({
    system: INTERVIEW_SYSTEM_PROMPT,
    messages: [{ role: "user", content: "Begin the interview with your first question." }],
    schema: interviewTurnSchema,
    toolName: ASK_QUESTION_TOOL.name,
    toolDescription: ASK_QUESTION_TOOL.description,
  });

  await addAssistantMessage(conversation.id, result.data.message);
  await logUsage({
    userId,
    conversationId: conversation.id,
    purpose: `${PURPOSE}.interview`,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
  });

  return { conversationId: conversation.id, message: result.data.message, done: false };
}

export async function continueInterview(
  userId: string,
  conversationId: string,
  userMessage: string,
): Promise<InterviewStep> {
  await loadOwnedConversation(userId, conversationId);

  await addUserMessage(conversationId, userMessage);
  const history = await getConversationHistory(conversationId);

  const result = await generateStructured({
    system: INTERVIEW_SYSTEM_PROMPT,
    messages: toMessageParams(history),
    schema: interviewTurnSchema,
    toolName: ASK_QUESTION_TOOL.name,
    toolDescription: ASK_QUESTION_TOOL.description,
  });

  await addAssistantMessage(conversationId, result.data.message);
  await logUsage({
    userId,
    conversationId,
    purpose: `${PURPOSE}.interview`,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
  });

  if (!result.data.readyToExtractProfile) {
    return { conversationId, message: result.data.message, done: false };
  }

  const { profile, goals } = await extractAndSaveProfile(userId, conversationId);
  return { conversationId, message: result.data.message, done: true, profile, goals };
}
