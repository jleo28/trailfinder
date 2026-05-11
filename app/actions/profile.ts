"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, updateProfileSchema } from "@/lib/schemas/profile";
import type { UpdateProfileInput } from "@/lib/schemas/profile";

export async function checkUsername(username: string): Promise<{ available: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { available: false };

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  return { available: !data };
}

export async function saveOnboarding(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    bio: formData.get("bio") || undefined,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { error: msg };
  }

  // Upload avatar if provided
  let avatarUrl: string | undefined;
  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const result = await uploadAvatarFile(file, user.id);
    if ("error" in result) return result;
    avatarUrl = result.url;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      bio: parsed.data.bio ?? null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is already taken." };
    return { error: "Could not save profile. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(input: UpdateProfileInput): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      bio: parsed.data.bio ?? null,
      location: parsed.data.location ?? null,
    })
    .eq("id", user.id);

  if (error) return { error: "Could not update profile. Please try again." };
  revalidatePath("/", "layout");
}

export async function uploadAvatar(formData: FormData): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };

  return uploadAvatarFile(file, user.id);
}

// ── internal helper ──────────────────────────────────────────────────────────

async function uploadAvatarFile(
  file: File,
  userId: string
): Promise<{ error: string } | { url: string }> {
  if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5 MB." };

  const buffer = Buffer.from(await file.arrayBuffer());

  const compressed = await sharp(buffer)
    .rotate() // auto-orient from EXIF
    .resize(400, 400, { fit: "cover", position: "center" })
    .webp({ quality: 82 })
    .toBuffer();

  const supabase = await createClient();
  const path = `${userId}.webp`;

  const { error } = await supabase.storage.from("avatars").upload(path, compressed, {
    contentType: "image/webp",
    upsert: true,
  });

  if (error) return { error: "Could not upload avatar." };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  return { url: publicUrl };
}
