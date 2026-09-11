import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "./env";

/**
 * Prisma client singleton.
 *
 * Created lazily on first use so importing this module never requires a
 * configured environment (keeps `next build` and unit tests cheap). Cached on
 * `globalThis` outside production so Next.js hot reloads reuse one connection pool.
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createClient(): PrismaClient {
  const env = getEnv();
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getDb(): PrismaClient {
  if (globalForPrisma.__prisma) return globalForPrisma.__prisma;
  const client = createClient();
  if (getEnv().NODE_ENV !== "production") globalForPrisma.__prisma = client;
  return client;
}
