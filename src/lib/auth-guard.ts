import { redirect } from "next/navigation";
import { getCurrentUser, getSessionTokenFromCookieStore, type PublicUser } from "@/modules/auth";

/**
 * Server Component page guard. Next.js-specific glue kept out of
 * src/modules/auth (which stays framework-light) — every authenticated page
 * calls this once at the top instead of re-deriving the redirect logic.
 */
export async function requireUser(): Promise<PublicUser> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

/** Like requireUser, but returns null instead of redirecting — for pages open to both states. */
export async function getOptionalUser(): Promise<PublicUser | null> {
  const token = await getSessionTokenFromCookieStore();
  return getCurrentUser(token);
}
