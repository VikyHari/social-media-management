import type { User } from "@/generated/prisma/client";

/** The subset of a User that is safe to send to the client (never passwordHash). */
export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}
