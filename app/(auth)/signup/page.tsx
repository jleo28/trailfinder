"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUp, signInWithGoogle } from "@/app/actions/auth";
import { signUpSchema, type SignUpInput } from "@/lib/schemas/auth";

function SignUpContent() {
  const params = useSearchParams();
  const urlError =
    params.get("error") === "google_failed"
      ? "Could not connect to Google. Please try again."
      : null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayError = serverError ?? urlError;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = (data: SignUpInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signUp(data);
      if (result?.error) setServerError(result.error);
    });
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-lg">
        <h1 className="font-serif text-2xl text-text mb-1">Create an account</h1>
        <p className="text-sm text-text-muted mb-6">
          Start logging hikes and connecting with friends.
        </p>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border-strong
                       bg-surface-muted h-10 text-sm font-medium text-text-soft
                       hover:bg-surface hover:text-text transition-colors duration-[150ms]"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {displayError && (
            <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {displayError}
            </p>
          )}

          <Field label="Display name" error={errors.display_name?.message}>
            <input
              {...register("display_name")}
              type="text"
              autoComplete="name"
              placeholder="Alex Rivera"
              className={inputClass(!!errors.display_name)}
            />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass(!!errors.email)}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <input
              {...register("password")}
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={inputClass(!!errors.password)}
            />
          </Field>

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 flex h-10 w-full items-center justify-center rounded-md bg-accent
                       text-sm font-medium text-accent-on hover:bg-accent-hover
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[150ms]"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/signin" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-soft">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "h-10 w-full rounded-md border bg-surface-muted px-3 text-sm text-text placeholder:text-text-muted",
    "outline-none transition-all duration-[150ms]",
    "focus:ring-2 focus:ring-accent/30 focus:border-accent",
    hasError ? "border-danger" : "border-border",
  ].join(" ");
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
