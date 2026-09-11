import { estimateCostUsd } from "./pricing";
import { recordUsage } from "./repository";
import type { AiModel } from "./models";

export interface LogUsageInput {
  userId: string;
  conversationId?: string;
  purpose: string;
  model: AiModel;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

/** Records one Claude API call. Never throws — a logging failure must not break the caller. */
export async function logUsage(input: LogUsageInput): Promise<void> {
  try {
    await recordUsage({
      ...input,
      estimatedCostUsd: estimateCostUsd(input.model, input.inputTokens, input.outputTokens),
    });
  } catch (error) {
    console.error("[ai] failed to record usage log", input.purpose, error);
  }
}
