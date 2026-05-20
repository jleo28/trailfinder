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
      <Header profile={profile} pendingRequestCount={pendingRequestCount} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
      <CommandPalette />
    </>
  );
}
