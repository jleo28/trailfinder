import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VisibilityPreference } from "@/components/settings/VisibilityPreference";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?redirect=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url, location")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-lg mx-auto px-6 py-12 space-y-12">
      <h1 className="font-serif text-3xl font-medium text-text">Settings</h1>

      {/* Profile summary */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted">
          Profile
        </h2>
        <div className="rounded-lg border border-border bg-surface px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text">{profile?.display_name}</p>
            <p className="text-xs text-text-muted">@{profile?.username}</p>
          </div>
          <Link
            href={`/u/${profile?.username}`}
            className="text-xs text-accent hover:text-accent-hover transition-colors shrink-0"
          >
            View profile →
          </Link>
        </div>
        <p className="text-xs text-text-muted">
          Full profile editing (avatar, bio, location) coming in a future update.
        </p>
      </section>

      {/* Default hike visibility */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted mb-1">
            Default hike visibility
          </h2>
          <p className="text-xs text-text-muted">
            Applied to new hikes when you log them. You can always override per hike.
          </p>
        </div>
        <VisibilityPreference />
      </section>

      {/* Sign out */}
      <section className="space-y-4">
        <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted">
          Account
        </h2>
        <form action={signOut}>
          <button
            type="submit"
            className="px-4 py-2 rounded-md border border-border text-text-soft text-sm
                       hover:bg-surface-muted hover:text-danger transition-colors duration-[150ms]"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
