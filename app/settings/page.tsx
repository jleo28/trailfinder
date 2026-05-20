import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditForm } from "@/components/settings/ProfileEditForm";
import { ThemePreference } from "@/components/settings/ThemePreference";
import { VisibilityPreference } from "@/components/settings/VisibilityPreference";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Settings" };

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted mb-4">
      {children}
    </h2>
  );
}

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
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-medium text-text">Settings</h1>
        {profile?.username && (
          <Link
            href={`/u/${profile.username}`}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            View profile →
          </Link>
        )}
      </div>

      {/* ── Profile ────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Profile</SectionHeader>
        <ProfileEditForm
          initialValues={{
            display_name: profile?.display_name ?? "",
            bio: profile?.bio ?? null,
            location: profile?.location ?? null,
            avatar_url: profile?.avatar_url ?? null,
          }}
        />
      </section>

      {/* ── Theme ──────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Theme</SectionHeader>
        <ThemePreference />
      </section>

      {/* ── Default hike visibility ────────────────────────────────── */}
      <section>
        <SectionHeader>Default hike visibility</SectionHeader>
        <p className="text-xs text-text-muted mb-4">
          Applied when you log a new hike. Override per hike in the log form.
        </p>
        <VisibilityPreference />
      </section>

      {/* ── Account ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader>Account</SectionHeader>
        <form action={signOut}>
          <button
            type="submit"
            className="px-4 py-2 rounded-md border border-border text-text-soft text-sm
                       hover:bg-surface-muted transition-colors duration-[150ms]"
          >
            Sign out
          </button>
        </form>
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-text-muted mb-3">
            Deletes your account and all hikes. Photos may remain in storage until
            manually cleaned up via the Supabase dashboard.
          </p>
          <DeleteAccount />
        </div>
      </section>
    </div>
  );
}
