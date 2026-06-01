import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CommandPalette } from "@/components/ui/CommandPalette";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Fetch auth state server-side so the initial HTML has the correct header
  // without any client-side flicker.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string; display_name: string; avatar_url: string | null } | null =
    null;
  let pendingRequestCount = 0;

  if (user) {
    const [profileRes, requestRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);
    profile = profileRes.data;
    pendingRequestCount = requestRes.count ?? 0;
  }

  return (
    <>
      {/* Skip navigation — visually hidden, appears on keyboard focus */}
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[200] -translate-y-20 rounded-md bg-accent px-4 py-2.5
                   text-sm font-medium text-accent-on shadow-lg
                   focus:translate-y-0 transition-transform duration-[150ms]"
      >
        Skip to main content
      </a>
      <Header profile={profile} pendingRequestCount={pendingRequestCount} />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
      <CommandPalette />
    </>
  );
}
