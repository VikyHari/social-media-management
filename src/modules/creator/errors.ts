export type CreatorErrorCode = "CONVERSATION_NOT_FOUND" | "FORBIDDEN";

export class CreatorError extends Error {
  constructor(
    public readonly code: CreatorErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CreatorError";
  }
}
