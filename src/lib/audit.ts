import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "./db";

export interface AuditEntry {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Records a sensitive action (auth events, account connect/disconnect, publish,
 * approve, ...). Failures are logged but never thrown — an audit-log write must
 * not break the user-facing action it is recording.
 */
export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await getDb().auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record entry", entry.action, error);
  }
}

/** Best-effort client IP from standard proxy headers. Not trustworthy for security decisions. */
export function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") ?? undefined;
}
