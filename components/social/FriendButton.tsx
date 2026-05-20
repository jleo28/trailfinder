"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus, Clock, Check } from "lucide-react";
import { sendFriendRequest, respondToRequest } from "@/app/actions/social";

type Status = "none" | "friends" | "outgoing" | "incoming";

export function FriendButton({
  profileId,
  friendshipId,
  initialStatus,
}: {
  profileId: string;
  friendshipId?: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [, startTransition] = useTransition();

  if (status === "friends") {
    return (
      <span className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-text-muted text-sm">
        <Check className="w-4 h-4" strokeWidth={1.5} />
        Friends
      </span>
    );
  }

  if (status === "outgoing") {
    return (
      <span className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-text-muted text-sm">
        <Clock className="w-4 h-4" strokeWidth={1.5} />
        Requested
      </span>
    );
  }

  if (status === "incoming") {
    return (
      <Link
        href="/friends?tab=requests"
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-accent-on text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        <UserPlus className="w-4 h-4" strokeWidth={1.5} />
        Accept request
      </Link>
    );
  }

  return (
    <button
      onClick={() => {
        setStatus("outgoing");
        startTransition(async () => { await sendFriendRequest(profileId); });
      }}
      className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-accent-on text-sm font-medium hover:bg-accent-hover transition-colors"
    >
      <UserPlus className="w-4 h-4" strokeWidth={1.5} />
      Add friend
    </button>
  );
}
