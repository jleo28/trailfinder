"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { updateProfile, uploadAvatar } from "@/app/actions/profile";

interface Props {
  initialValues: {
    display_name: string;
    bio: string | null;
    location: string | null;
    avatar_url: string | null;
  };
}

export function ProfileEditForm({ initialValues }: Props) {
  const [displayName, setDisplayName] = useState(initialValues.display_name);
  const [bio, setBio] = useState(initialValues.bio ?? "");
  const [location, setLocation] = useState(initialValues.location ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialValues.avatar_url
  );
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      // Upload avatar first if a new file was selected
      const file = fileRef.current?.files?.[0];
      if (file) {
        const fd = new FormData();
        fd.append("avatar", file);
        const res = await uploadAvatar(fd);
        if ("error" in res) {
          setMessage({ type: "err", text: res.error });
          return;
        }
      }

      const res = await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
      });
      if (res && "error" in res) {
        setMessage({ type: "err", text: res.error });
      } else {
        setMessage({ type: "ok", text: "Profile updated." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-16 h-16 rounded-full overflow-hidden bg-accent-soft
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                     hover:opacity-80 transition-opacity"
          aria-label="Change avatar"
        >
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar"
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <span className="text-accent text-xl font-medium">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-medium">Edit</span>
          </div>
        </button>
        <div>
          <p className="text-sm font-medium text-text">Profile photo</p>
          <p className="text-xs text-text-muted mt-0.5">JPG, PNG or WebP · max 5 MB</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <label htmlFor="display_name" className="text-sm font-medium text-text-soft">
          Display name
        </label>
        <input
          id="display_name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          required
          className="w-full h-10 rounded-md bg-surface-muted border border-border px-3 text-sm text-text
                     placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft
                     transition-[border-color,box-shadow] duration-[150ms]"
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-text-soft">
          Bio
          <span className="text-text-muted font-normal ml-1">(optional)</span>
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="A short hiker bio…"
          className="w-full rounded-md bg-surface-muted border border-border px-3 py-2 text-sm text-text
                     placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft
                     resize-none transition-[border-color,box-shadow] duration-[150ms]"
        />
        <p className="text-xs text-text-muted text-right">{bio.length}/200</p>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label htmlFor="location" className="text-sm font-medium text-text-soft">
          Location
          <span className="text-text-muted font-normal ml-1">(optional)</span>
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          placeholder="Los Angeles, CA"
          className="w-full h-10 rounded-md bg-surface-muted border border-border px-3 text-sm text-text
                     placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft
                     transition-[border-color,box-shadow] duration-[150ms]"
        />
      </div>

      {/* Status + submit */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending || !displayName.trim()}
          className="px-4 py-2 rounded-md bg-accent text-accent-on text-sm font-medium
                     hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-[150ms]"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {message && (
          <p
            className={`text-sm ${
              message.type === "ok" ? "text-success" : "text-danger"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
