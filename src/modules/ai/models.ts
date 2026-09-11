/**
 * Exact Claude model IDs live here and only here (see decisions.md D-005) —
 * no other module should hardcode a model string.
 */
export const AI_MODELS = {
  /** Default for most structured extraction / interpretation tasks. */
  sonnet: "claude-sonnet-5",
  /** Heaviest reasoning: multi-step strategy, long-form scripts. */
  opus: "claude-opus-5",
  /** Anthropic's most capable generally available model. Use sparingly (cost). */
  fable: "claude-fable-5-1",
  /** Cheap/fast: classification, short summaries, simple formatting. */
  haiku: "claude-haiku-4-5-20251001",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

export const DEFAULT_MODEL: AiModel = AI_MODELS.sonnet;
