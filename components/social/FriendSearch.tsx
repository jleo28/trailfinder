"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Search, UserPlus, Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendFriendRequest } from "@/app/actions/social";

interface UserResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

type RelationshipStatus = "none" | "friends" | "outgoing" | "incoming";

export function FriendSearch({
  currentUserId,
  relationships,
}: {
  currentUserId: string;
  relationships: { userId: string; status: RelationshipStatus }[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const relMap = new Map(relationships.map((r) => [r.userId, r.status]));

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("id", currentUserId)
        .limit(10);
      setResults((data ?? []) as UserResult[]);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  function handleAdd(userId: string) {
    startTransition(async () => {
      const result = await sendFriendRequest(userId);
      if (result.ok) setSent((s) => new Set(s).add(userId));
    });
  }

  function statusFor(userId: string): RelationshipStatus {
    if (sent.has(userId)) return "outgoing";
    return relMap.get(userId) ?? "none";
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          strokeWidth={1.5}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username…"
          autoFocus
          className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-surface-muted text-sm
                     text-text placeholder:text-text-muted focus:outline-none focus:border-accent
                     focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      {loading && (
        <p className="text-xs text-text-muted animate-pulse">Searching…</p>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-sm text-text-muted">No users found for &ldquo;{query}&rdquo;.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((u) => {
            const status = statusFor(u.id);
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-surface"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-accent-soft shrink-0">
                  {u.avatar_url ? (
                    <Image
                      src={u.avatar_url}
                      alt={u.display_name}
                      width={36}
                      height={36}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-accent text-sm font-medium">
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{u.display_name}</p>
                  <p className="text-xs text-text-muted">@{u.username}</p>
                </div>

                {status === "none" && (
                  <button
                    onClick={() => handleAdd(u.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-accent-on
                               text-xs font-medium hover:bg-accent-hover transition-colors shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Add
                  </button>
                )}
                {status === "outgoing" && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
                    <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Requested
                  </span>
                )}
                {status === "incoming" && (
                  <span className="flex items-center gap-1.5 text-xs text-accent shrink-0">
                    <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Wants to connect
                  </span>
                )}
                {status === "friends" && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Friends
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
