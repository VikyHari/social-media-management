import { z } from "zod";

// bcrypt only uses the first 72 bytes of a password; capping length here keeps
// hashing behavior predictable instead of silently ignoring extra characters.
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address");
const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const signupSchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().trim().min(1).max(100).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;
