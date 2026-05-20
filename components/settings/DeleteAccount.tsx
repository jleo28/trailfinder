"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/profile";

export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-4 py-2 rounded-md border border-border text-danger text-sm
                   hover:bg-danger/5 transition-colors duration-[150ms]"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 space-y-3">
      <p className="text-sm text-text-soft">
        This will permanently delete your account and all your hikes, photos, and
        comments. This cannot be undone.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="px-4 py-2 rounded-md bg-danger text-white text-sm font-medium
                     hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-opacity duration-[150ms]"
        >
          {isPending ? "Deleting…" : "Yes, delete my account"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-4 py-2 rounded-md border border-border text-text-soft text-sm
                     hover:bg-surface-muted transition-colors duration-[150ms]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
