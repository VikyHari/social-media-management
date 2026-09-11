import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAiClient } from "./client";
import { AiError } from "./errors";
import { DEFAULT_MODEL, type AiModel } from "./models";

export interface GenerateStructuredInput<T> {
  /** System prompt: who the AI is and how it should behave for this call. */
  system?: string;
  messages: Anthropic.MessageParam[];
  schema: z.ZodType<T>;
  /** Name of the forced tool call the model uses to return structured output. */
  toolName: string;
  toolDescription: string;
  model?: AiModel;
  maxTokens?: number;
  /** Injectable for tests; defaults to the real lazy client singleton. */
  client?: Pick<Anthropic, "messages">;
}

export interface GenerateStructuredResult<T> {
  data: T;
  model: AiModel;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** True if the first response failed schema validation and a corrective retry ran. */
  retried: boolean;
}

function toInputSchema(schema: z.ZodType): Anthropic.Tool.InputSchema {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema; // metadata Anthropic's tool schema doesn't need
  return jsonSchema as Anthropic.Tool.InputSchema;
}

function findToolUse(
  content: Anthropic.ContentBlock[],
  toolName: string,
): Anthropic.ToolUseBlock | undefined {
  return content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === toolName,
  );
}

function summarizeZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Calls Claude with a single forced tool call whose input_schema mirrors a
 * Zod schema, validates the result, and retries once with an explicit
 * correction if validation fails. This is the only way any module should
 * get structured data out of Claude — never parse free-form text as JSON.
 */
export async function generateStructured<T>(
  input: GenerateStructuredInput<T>,
): Promise<GenerateStructuredResult<T>> {
  const model = input.model ?? DEFAULT_MODEL;
  const maxTokens = input.maxTokens ?? 4096;
  const client = input.client ?? getAiClient();

  const tool: Anthropic.Tool = {
    name: input.toolName,
    description: input.toolDescription,
    input_schema: toInputSchema(input.schema),
  };
  const toolChoice: Anthropic.ToolChoiceTool = { type: "tool", name: input.toolName };

  const startedAt = Date.now();
  let messages: Anthropic.MessageParam[] = [...input.messages];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: input.system,
        messages,
        tools: [tool],
        tool_choice: toolChoice,
      });
    } catch (error) {
      throw new AiError("REQUEST_FAILED", "The Claude API request failed.", error);
    }

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    const toolUse = findToolUse(response.content, input.toolName);
    if (!toolUse) {
      throw new AiError("NO_TOOL_RESULT", "Claude did not call the expected tool.");
    }

    const parsed = input.schema.safeParse(toolUse.input);
    if (parsed.success) {
      return {
        data: parsed.data,
        model,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        latencyMs: Date.now() - startedAt,
        retried: attempt > 0,
      };
    }

    if (attempt === 1) {
      throw new AiError(
        "INVALID_OUTPUT",
        `Claude's output failed schema validation twice: ${summarizeZodError(parsed.error)}`,
      );
    }

    // One corrective retry: tell Claude exactly what was wrong via a tool_result.
    messages = [
      ...messages,
      {
        role: "assistant",
        content: response.content as unknown as Anthropic.MessageParam["content"],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Your input didn't match the required schema: ${summarizeZodError(
              parsed.error,
            )}. Call the tool again with corrected input.`,
          },
        ],
      },
    ];
  }

  // Unreachable: the loop always returns or throws above.
  throw new AiError("INVALID_OUTPUT", "Claude's output failed schema validation.");
}
