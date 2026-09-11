import { z } from "zod";

/**
 * Runtime environment configuration.
 *
 * Parsed lazily (not at import time) so `next build` does not require a full
 * environment, and so tests can supply their own values.
 */
const isUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().refine(isUrl, "APP_URL must be a valid URL").default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL must be a postgresql:// URL"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)"),
  ANTHROPIC_API_KEY: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n- ${issues.join("\n- ")}`);
    this.name = "EnvError";
  }
}

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new EnvError(issues);
  }
  return result.data;
}

let cached: Env | undefined;

/** Cached, validated environment. Throws EnvError on first call if misconfigured. */
export function getEnv(): Env {
  if (!cached) cached = parseEnv();
  return cached;
}

/** Test helper: clear the cache so a new process.env is re-read. */
export function resetEnvCache(): void {
  cached = undefined;
}
