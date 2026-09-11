import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://creator:creator@localhost:5432/creator_growth",
  SESSION_SECRET: "a".repeat(64),
  TOKEN_ENCRYPTION_KEY: "0".repeat(64),
};

describe("parseEnv", () => {
  it("accepts a valid configuration and applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.NODE_ENV).toBe("development");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
  });

  it("rejects a missing database url", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(EnvError);
  });

  it("rejects a non-postgres database url", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://x" })).toThrow(/postgresql/);
  });

  it("rejects a short session secret", () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });

  it("rejects a malformed token encryption key", () => {
    expect(() => parseEnv({ ...valid, TOKEN_ENCRYPTION_KEY: "zz" })).toThrow(/64 hex/);
  });
});
