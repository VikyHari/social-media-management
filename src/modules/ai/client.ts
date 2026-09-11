import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";
import { AiError } from "./errors";

/**
 * Lazy Anthropic client singleton, same pattern as src/lib/db.ts. Importing
 * this module never requires ANTHROPIC_API_KEY to be set; only calling
 * getAiClient() does, with a clear error instead of an SDK stack trace.
 */
const globalForAi = globalThis as unknown as { __anthropic?: Anthropic };

export function getAiClient(): Anthropic {
  if (globalForAi.__anthropic) return globalForAi.__anthropic;

  const apiKey = getEnv().ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiError(
      "MISSING_API_KEY",
      "ANTHROPIC_API_KEY is not set. Add it to .env to use AI features.",
    );
  }

  const client = new Anthropic({ apiKey });
  if (getEnv().NODE_ENV !== "production") globalForAi.__anthropic = client;
  return client;
}
