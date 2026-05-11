import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Fetch auth state server-side so the initial HTML has the correct header
  // without any client-side flicker.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string; display_name: string; avatar_url: string | null } | null =
    null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <>
      <Header profile={profile} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
