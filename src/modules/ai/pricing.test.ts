import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "./pricing";
import { AI_MODELS } from "./models";

describe("estimateCostUsd", () => {
  it("returns null for a model with no configured pricing (the current default)", () => {
    expect(estimateCostUsd(AI_MODELS.sonnet, 1000, 1000)).toBeNull();
    expect(estimateCostUsd(AI_MODELS.opus, 0, 0)).toBeNull();
  });
});
