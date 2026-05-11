"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SignInInput, SignUpInput } from "@/lib/schemas/auth";

function friendlyError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("Email not confirmed")) return "Check your inbox to confirm your email first.";
  if (msg.includes("User already registered")) return "An account with that email already exists.";
  if (msg.includes("Password should be at least")) return "Password must be at least 6 characters.";
  if (msg.includes("rate limit")) return "Too many attempts — please wait a moment and try again.";
  if (msg.includes("Email rate limit")) return "Too many sign-up attempts. Please try again later.";
  return "Something went wrong. Please try again.";
}

export async function signIn(
  input: SignInInput,
  redirectTo = "/"
): Promise<{ error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) return { error: friendlyError(error.message) };
  // Only allow relative same-origin redirects
  const dest = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  redirect(dest);
}

export async function signUp(input: SignUpInput): Promise<{ error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.display_name } },
  });
  if (error) return { error: friendlyError(error.message) };
  redirect("/onboarding");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Returns void so it can be used directly as a <form action>.
// On failure it redirects to /signin?error=google_failed instead of returning an error object.
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });
  if (error || !data.url) redirect("/signin?error=google_failed");
  redirect(data.url);
}
