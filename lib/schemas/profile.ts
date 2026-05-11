import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "At least 3 characters")
  .max(20, "20 characters max")
  .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only");

export const onboardingSchema = z.object({
  username: usernameSchema,
  bio: z.string().max(200, "200 characters max").optional(),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(1, "Required").max(50, "50 characters max"),
  bio: z.string().max(200, "200 characters max").optional(),
  location: z.string().max(100, "100 characters max").optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
