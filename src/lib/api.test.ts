import { z } from "zod";
import { describe, expect, it } from "vitest";
import { ApiError, apiErrorResponse, parseJsonBody } from "./api";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("parseJsonBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns parsed data for a valid body", async () => {
    await expect(parseJsonBody(jsonRequest({ name: "Ada" }), schema)).resolves.toEqual({
      name: "Ada",
    });
  });

  it("throws a 400 ApiError for invalid shape", async () => {
    await expect(parseJsonBody(jsonRequest({ name: "" }), schema)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("throws a 400 ApiError for malformed JSON", async () => {
    const request = new Request("http://localhost/test", { method: "POST", body: "not json" });
    await expect(parseJsonBody(request, schema)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiErrorResponse", () => {
  it("uses the ApiError status and message", async () => {
    const response = apiErrorResponse(new ApiError(409, "conflict"));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "conflict" });
  });

  it("falls back to a generic 500 for unknown errors", async () => {
    const response = apiErrorResponse(new Error("boom"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Something went wrong. Please try again." });
  });
});
