import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        // Auto-generated usernames start with "user_" — send these to onboarding
        const isNew = !profile || profile.username.startsWith("user_");
        return NextResponse.redirect(new URL(isNew ? "/onboarding" : "/", request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/signin?error=auth_failed", request.url));
}
