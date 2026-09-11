import bcrypt from "bcryptjs";

/**
 * bcrypt only uses the first 72 bytes of input; callers should enforce a
 * max password length at the validation layer (see schemas.ts) so behavior
 * stays predictable rather than silently truncating.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
