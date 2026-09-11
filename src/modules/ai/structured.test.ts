import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiError } from "./errors";
import { AI_MODELS } from "./models";
import { generateStructured } from "./structured";

const schema = z.object({ niche: z.string(), confidence: z.number().min(0).max(1) });

function usage(inputTokens: number, outputTokens: number) {
  return { input_tokens: inputTokens, output_tokens: outputTokens };
}

function toolUseResponse(input: unknown, tokens: [number, number] = [50, 20]) {
  return {
    content: [{ type: "tool_use", id: "tu_1", name: "extract_niche", input }],
    usage: usage(...tokens),
  };
}

describe("generateStructured", () => {
  const baseInput = {
    messages: [{ role: "user" as const, content: "I make woodworking videos." }],
    schema,
    toolName: "extract_niche",
    toolDescription: "Extract the creator's niche.",
    model: AI_MODELS.sonnet,
  };

  it("returns validated data on the first response", async () => {
    const create = vi
      .fn()
      .mockResolvedValue(toolUseResponse({ niche: "woodworking", confidence: 0.9 }));
    const result = await generateStructured({
      ...baseInput,
      client: { messages: { create } } as never,
    });

    expect(result.data).toEqual({ niche: "woodworking", confidence: 0.9 });
    expect(result.retried).toBe(false);
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(20);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries once with a corrective tool_result when validation fails, then succeeds", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(
        toolUseResponse({ niche: "woodworking", confidence: "high" }, [50, 20]),
      )
      .mockResolvedValueOnce(toolUseResponse({ niche: "woodworking", confidence: 0.9 }, [70, 25]));

    const result = await generateStructured({
      ...baseInput,
      client: { messages: { create } } as never,
    });

    expect(result.data).toEqual({ niche: "woodworking", confidence: 0.9 });
    expect(result.retried).toBe(true);
    expect(result.inputTokens).toBe(120); // summed across both attempts
    expect(result.outputTokens).toBe(45);
    expect(create).toHaveBeenCalledTimes(2);

    // The retry must tell the model what was wrong via a tool_result block.
    const secondCallArgs = create.mock.calls[1]?.[0];
    const lastMessage = secondCallArgs.messages.at(-1);
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content[0].type).toBe("tool_result");
    expect(lastMessage.content[0].is_error).toBe(true);
  });

  it("throws AiError(INVALID_OUTPUT) if validation still fails after the retry", async () => {
    const create = vi.fn().mockResolvedValue(toolUseResponse({ niche: "woodworking" })); // missing confidence
    await expect(
      generateStructured({ ...baseInput, client: { messages: { create } } as never }),
    ).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("throws AiError(NO_TOOL_RESULT) if the model doesn't call the tool", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ content: [{ type: "text", text: "hi" }], usage: usage(10, 5) });
    await expect(
      generateStructured({ ...baseInput, client: { messages: { create } } as never }),
    ).rejects.toBeInstanceOf(AiError);
  });

  it("wraps a transport/API error as AiError(REQUEST_FAILED)", async () => {
    const create = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(
      generateStructured({ ...baseInput, client: { messages: { create } } as never }),
    ).rejects.toMatchObject({ code: "REQUEST_FAILED" });
  });
});
