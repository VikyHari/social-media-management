export type IntegrationErrorCode =
  | "INVALID_STATE"
  | "TOKEN_EXCHANGE_FAILED"
  | "PROVIDER_ERROR"
  | "ACCOUNT_NOT_FOUND"
  | "FORBIDDEN"
  | "MISSING_CREDENTIALS";

export class IntegrationError extends Error {
  constructor(
    public readonly code: IntegrationErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}
