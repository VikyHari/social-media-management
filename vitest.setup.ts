// Explicitly load .env for the test process — Vitest does not do this
// automatically. Mirrors prisma.config.ts's `import "dotenv/config"`.
// Safe if .env doesn't exist (e.g. CI, which sets real env vars directly):
// dotenv only fills in keys that aren't already set and never throws here.
import "dotenv/config";
