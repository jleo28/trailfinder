import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { FriendSearch } from "@/components/social/FriendSearch";
import { respondToRequest, removeFriend } from "@/app/actions/social";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Friends" };

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

type Tab = "friends" | "requests" | "find";

type FriendProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

function Avatar({ profile, size = 40 }: { profile: FriendProfile; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden bg-accent-soft shrink-0"
      style={{ width: size, height: size }}
    >
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.display_name}
          width={size}
          height={size}
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-accent font-medium"
          style={{ fontSize: size * 0.4 }}>
          {profile.display_name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default async function FriendsPage({ searchParams }: PageProps) {
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "requests" || tabParam === "find" ? tabParam : "friends";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?redirect=/friends");

  const { data: raw } = await supabase
    .from("friendships")
    .select(
      `id, status, requester_id, addressee_id,
       requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url),
       addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)`
    )
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  function other(f: typeof raw extends (infer T)[] | null ? T : never): FriendProfile {
    const p =
      (f as { requester_id: string; requester: unknown; addressee: unknown }).requester_id === user!.id
        ? (f as { addressee: unknown }).addressee
        : (f as { requester: unknown }).requester;
    const profile = Array.isArray(p) ? p[0] : p;
    return profile as FriendProfile;
  }

  type Row = NonNullable<typeof raw>[number];

  const accepted: Row[] = (raw ?? []).filter((f) => f.status === "accepted");
  const incoming: Row[] = (raw ?? []).filter(
    (f) => f.status === "pending" && f.addressee_id === user.id
  );
  const outgoing: Row[] = (raw ?? []).filter(
    (f) => f.status === "pending" && f.requester_id === user.id
  );

  const relationships = (raw ?? []).map((f) => ({
    userId: f.requester_id === user.id ? f.addressee_id : f.requester_id,
    status: (
      f.status === "accepted"
        ? "friends"
        : f.requester_id === user.id
        ? "outgoing"
        : "incoming"
    ) as "friends" | "outgoing" | "incoming",
  }));

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "friends", label: "Friends", count: accepted.length },
    { id: "requests", label: "Requests", count: incoming.length || undefined },
    { id: "find", label: "Find people" },
  ];

  const tabClass = (id: Tab) =>
    cn(
      "relative px-4 py-2.5 text-sm font-medium transition-colors duration-[150ms]",
      tab === id
        ? "text-accent border-b-2 border-accent"
        : "text-text-muted hover:text-text"
    );

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl font-medium text-text mb-8">Friends</h1>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8 -mx-1">
        {tabs.map(({ id, label, count }) => (
          <Link key={id} href={`/friends?tab=${id}`} className={tabClass(id)}>
            {label}
            {!!count && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full
                               bg-accent text-accent-on text-[10px] font-bold">
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Friends tab ──────────────────────────────────────────────── */}
      {tab === "friends" && (
        <div className="space-y-3">
          {accepted.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-muted text-sm mb-3">No friends yet.</p>
              <Link
                href="/friends?tab=find"
                className="text-sm text-accent hover:text-accent-hover"
              >
                Find people to connect with →
              </Link>
            </div>
          ) : (
            accepted.map((f) => {
              const person = other(f);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-surface"
                >
                  <Avatar profile={person} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/u/${person.username}`}
                      className="text-sm font-medium text-text hover:text-accent transition-colors block truncate"
                    >
                      {person.display_name}
                    </Link>
                    <p className="text-xs text-text-muted">@{person.username}</p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await removeFriend(f.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-text-muted hover:text-danger transition-colors"
                    >
                      Unfriend
                    </button>
                  </form>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Requests tab ─────────────────────────────────────────────── */}
      {tab === "requests" && (
        <div className="space-y-6">
          {/* Incoming */}
          <div>
            <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted mb-4">
              Incoming ({incoming.length})
            </h2>
            {incoming.length === 0 ? (
              <p className="text-sm text-text-muted">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {incoming.map((f) => {
                  const person = other(f);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-surface"
                    >
                      <Avatar profile={person} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{person.display_name}</p>
                        <p className="text-xs text-text-muted">@{person.username}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <form
                          action={async () => {
                            "use server";
                            await respondToRequest(f.id, true);
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-md bg-accent text-accent-on text-xs font-medium
                                       hover:bg-accent-hover transition-colors"
                          >
                            Accept
                          </button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await respondToRequest(f.id, false);
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-md border border-border text-text-muted text-xs
                                       hover:bg-surface-muted transition-colors"
                          >
                            Decline
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <h2 className="text-xs font-medium tracking-[0.06em] uppercase text-text-muted mb-4">
              Sent ({outgoing.length})
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-sm text-text-muted">No outgoing requests.</p>
            ) : (
              <div className="space-y-3">
                {outgoing.map((f) => {
                  const person = other(f);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-surface"
                    >
                      <Avatar profile={person} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{person.display_name}</p>
                        <p className="text-xs text-text-muted">@{person.username}</p>
                      </div>
                      <span className="text-xs text-text-muted shrink-0">Waiting…</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Find tab ─────────────────────────────────────────────────── */}
      {tab === "find" && (
        <FriendSearch currentUserId={user.id} relationships={relationships} />
      )}
    </div>
  );
}
