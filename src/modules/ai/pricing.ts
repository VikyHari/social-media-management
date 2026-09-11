import type { AiModel } from "./models";

interface ModelPricing {
  /** USD per 1,000,000 input tokens. */
  inputPerMillion: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMillion: number;
}

/**
 * Deliberately empty. Do not guess prices — an invented number presented as a
 * cost is worse than no number (see architecture.md "no false certainty").
 * Fill in verified rates from https://www.anthropic.com/pricing before
 * relying on estimatedCostUsd for real budgeting; until then it stays null
 * and AiUsageLog's accurate input/output token counts are the source of truth.
 */
const PRICING_USD_PER_MILLION_TOKENS: Partial<Record<AiModel, ModelPricing>> = {};

/** Returns null when the model has no verified pricing entry yet. */
export function estimateCostUsd(
  model: AiModel,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const pricing = PRICING_USD_PER_MILLION_TOKENS[model];
  if (!pricing) return null;
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6 decimal places
}
