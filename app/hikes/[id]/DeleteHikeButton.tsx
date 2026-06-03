"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteHike } from "@/app/actions/hikes";

export function DeleteHikeButton({ hikeId }: { hikeId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Delete this hike? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deleteHike(hikeId);
      if (result.ok) {
        router.push("/feed");
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-danger/40 text-danger
                 text-xs font-medium hover:bg-danger/8 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors duration-[150ms]"
    >
      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
