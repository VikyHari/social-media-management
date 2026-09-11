import { z } from "zod";

/**
 * Shape of a fully-derived creator profile — what generateStructured() forces
 * Claude to produce at the end of the onboarding interview (Part 24). Kept
 * intentionally close to free text (strings/string arrays) rather than rigid
 * enums: the interview is open-ended and an LLM's phrasing shouldn't be
 * rejected by an over-strict schema. Zod is still the validation gate before
 * anything reaches the database (D-006/D-009) — every field is required so a
 * partial/lazy extraction fails loudly instead of saving an incomplete profile.
 */
export const creatorProfileExtractionSchema = z.object({
  primaryNiche: z.string().min(1).max(200),
  secondaryNiches: z.array(z.string().min(1).max(200)).max(10),
  interests: z.array(z.string().min(1).max(200)).max(15),
  skills: z.array(z.string().min(1).max(200)).max(15),
  targetAudience: z.string().min(1).max(1000),
  platforms: z.array(z.enum(["instagram", "facebook", "youtube"])).min(1),
  contentFormats: z.array(z.string().min(1).max(100)).max(10),
  language: z.string().min(1).max(100),
  strengths: z.array(z.string().min(1).max(200)).max(10),
  weaknesses: z.array(z.string().min(1).max(200)).max(10),
  equipment: z.array(z.string().min(1).max(200)).max(20),
  budget: z.string().min(1).max(500),
  timeAvailable: z.string().min(1).max(300),
  experienceLevel: z.enum(["beginner", "intermediate", "experienced"]),
  existingContent: z.string().max(2000).optional(),
  competitors: z.array(z.string().min(1).max(200)).max(15),
  monetizationGoals: z.string().min(1).max(1000),
  brandPositioning: z.string().min(1).max(1000),
  contentPillars: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        weightPercent: z.number().min(0).max(100),
        rationale: z.string().min(1).max(500),
      }),
    )
    .max(8)
    .optional(),
  rawNotes: z.string().max(2000).optional(),
  goals: z
    .array(
      z.object({
        description: z.string().min(1).max(500),
        category: z.string().min(1).max(100).optional(),
        targetValue: z.string().min(1).max(200).optional(),
      }),
    )
    .min(1)
    .max(8),
});
export type CreatorProfileExtraction = z.infer<typeof creatorProfileExtractionSchema>;
/** Profile fields only, excluding the separately-persisted `goals` array. */
export type CreatorProfileFields = Omit<CreatorProfileExtraction, "goals">;

/**
 * Shape of one interview turn's structured decision: what to say next, and
 * whether enough signal exists to end the interview and extract a profile.
 * This is what keeps the interview adaptive instead of a fixed script
 * (Part 23) — the AI decides, per turn, what's still missing.
 */
export const interviewTurnSchema = z.object({
  message: z.string().min(1).max(2000),
  readyToExtractProfile: z.boolean(),
});
export type InterviewTurn = z.infer<typeof interviewTurnSchema>;

export const startInterviewSchema = z.object({});

export const continueInterviewSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(4000),
});

export const createGoalSchema = z.object({
  description: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(100).optional(),
  targetValue: z.string().trim().min(1).max(200).optional(),
  targetDate: z.coerce.date().optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
