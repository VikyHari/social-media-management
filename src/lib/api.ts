import { NextResponse } from "next/server";
import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Parses and validates a JSON request body, throwing ApiError(400) on failure. */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  return parsed.data;
}

/** Converts a thrown error into a JSON error response. Never leaks internals for unknown errors. */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api] unhandled error", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
