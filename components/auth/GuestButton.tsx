"use client";

import { useFormStatus } from "react-dom";
import { signInAsGuest } from "@/app/actions/auth";

function Inner({ className, label }: { className: string; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? "Setting up the demo…" : label}
    </button>
  );
}

export function GuestButton({
  className = "",
  label = "Try as guest",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action={signInAsGuest}>
      <Inner className={className} label={label} />
    </form>
  );
}
