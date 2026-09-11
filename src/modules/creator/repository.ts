import { getDb } from "@/lib/db";
import type { CreatorProfileFields } from "./schemas";

export function findProfileByUserId(userId: string) {
  return getDb().creatorProfile.findUnique({ where: { userId } });
}

/**
 * Creates the profile on first onboarding, or overwrites it if the creator
 * re-runs onboarding later (Part 24: "the AI should update this over time").
 */
export function upsertProfile(input: {
  userId: string;
  sourceConversationId?: string;
  data: CreatorProfileFields;
}) {
  return getDb().creatorProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      sourceConversationId: input.sourceConversationId,
      ...input.data,
    },
    update: { sourceConversationId: input.sourceConversationId, ...input.data },
  });
}

export function createGoal(input: {
  userId: string;
  creatorProfileId?: string;
  description: string;
  category?: string;
  targetValue?: string;
  targetDate?: Date;
}) {
  return getDb().goal.create({
    data: {
      userId: input.userId,
      creatorProfileId: input.creatorProfileId,
      description: input.description,
      category: input.category,
      targetValue: input.targetValue,
      targetDate: input.targetDate,
    },
  });
}

export function listGoals(userId: string) {
  return getDb().goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}
