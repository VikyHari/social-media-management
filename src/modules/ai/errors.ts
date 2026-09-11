export type AiErrorCode =
  "MISSING_API_KEY" | "REQUEST_FAILED" | "INVALID_OUTPUT" | "NO_TOOL_RESULT";

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}
