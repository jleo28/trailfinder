"use client";

import { RotateCcw } from "lucide-react";

export function ErrorState({
  reset,
  message = "Something went wrong.",
}: {
  reset?: () => void;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <p className="font-serif text-xl text-text-soft mb-2">{message}</p>
      <p className="text-sm text-text-muted mb-6">
        This is our fault, not yours.
      </p>
      {reset && (
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border
                     text-sm text-text-soft hover:bg-surface-muted transition-colors duration-[150ms]"
        >
          <RotateCcw size={14} strokeWidth={1.5} />
          Try again
        </button>
      )}
    </div>
  );
}
