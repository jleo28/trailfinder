"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Check, X, Loader2 } from "lucide-react";
import { saveOnboarding, checkUsername } from "@/app/actions/profile";
import { onboardingSchema, type OnboardingInput } from "@/lib/schemas/profile";

type Availability = "idle" | "checking" | "available" | "taken";

export default function OnboardingPage() {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<File | null>(null);
  const checkCounterRef = useRef(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OnboardingInput>({ resolver: zodResolver(onboardingSchema) });

  const username = watch("username") ?? "";
  const usernameValid = !errors.username && username.length >= 3;

  // Debounced availability check — all setState calls happen inside async callbacks
  useEffect(() => {
    if (!usernameValid) return;
    const id = ++checkCounterRef.current;
    const timer = setTimeout(async () => {
      setAvailability("checking");
      const { available } = await checkUsername(username);
      if (id !== checkCounterRef.current) return; // stale
      setAvailability(available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timer);
  }, [username, usernameValid]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarFileRef.current = file;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const onSubmit = (data: OnboardingInput) => {
    if (availability === "taken") return;
    setServerError(null);

    const fd = new FormData();
    fd.append("username", data.username);
    if (data.bio) fd.append("bio", data.bio);
    if (avatarFileRef.current) fd.append("avatar", avatarFileRef.current);

    startTransition(async () => {
      const result = await saveOnboarding(fd);
      if (result?.error) setServerError(result.error);
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-16">
      <Link
        href="/"
        className="font-serif text-2xl text-text tracking-tight hover:text-accent transition-colors duration-[150ms] mb-10"
      >
        TrailFinder
      </Link>

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-lg">
          <h1 className="font-serif text-2xl text-text mb-1">Set up your profile</h1>
          <p className="text-sm text-text-muted mb-8">
            Choose a username to get started. You can change this later.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {/* Avatar */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-20 w-20 rounded-full bg-accent-soft border-2 border-border
                           hover:border-accent transition-colors duration-[150ms] overflow-hidden"
                aria-label="Upload avatar"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                    <Camera size={20} className="text-accent" />
                    <span className="text-xs text-accent font-medium">Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full
                                bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-[150ms]">
                  <Camera size={18} className="text-white" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {serverError && (
              <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {serverError}
              </p>
            )}

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-soft">Username</label>
              <div className="relative">
                <input
                  {...register("username")}
                  type="text"
                  autoComplete="username"
                  placeholder="trailblazer"
                  autoFocus
                  className={[
                    "h-10 w-full rounded-md border bg-surface-muted px-3 pr-8 text-sm text-text",
                    "placeholder:text-text-muted outline-none transition-all duration-[150ms]",
                    "focus:ring-2 focus:ring-accent/30 focus:border-accent",
                    errors.username ? "border-danger" : "border-border",
                  ].join(" ")}
                />
                {usernameValid && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {availability === "checking" && (
                      <Loader2 size={14} className="text-text-muted animate-spin" />
                    )}
                    {availability === "available" && (
                      <Check size={14} className="text-success" />
                    )}
                    {availability === "taken" && (
                      <X size={14} className="text-danger" />
                    )}
                  </span>
                )}
              </div>
              {errors.username && (
                <p className="text-xs text-danger">{errors.username.message}</p>
              )}
              {usernameValid && availability === "taken" && (
                <p className="text-xs text-danger">That username is taken.</p>
              )}
              {usernameValid && availability === "available" && (
                <p className="text-xs text-success">Looks good!</p>
              )}
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-soft">
                Bio{" "}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                {...register("bio")}
                rows={3}
                placeholder="Weekend hiker. Chasing summits around LA."
                className={[
                  "w-full resize-none rounded-md border bg-surface-muted px-3 py-2 text-sm text-text",
                  "placeholder:text-text-muted outline-none transition-all duration-[150ms]",
                  "focus:ring-2 focus:ring-accent/30 focus:border-accent",
                  errors.bio ? "border-danger" : "border-border",
                ].join(" ")}
              />
              {errors.bio && (
                <p className="text-xs text-danger">{errors.bio.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || availability === "taken" || availability === "checking"}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent
                         text-sm font-medium text-accent-on hover:bg-accent-hover
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[150ms]"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Let's go"
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-text-muted">
          You can update your profile any time from Settings.
        </p>
      </div>
    </div>
  );
}
