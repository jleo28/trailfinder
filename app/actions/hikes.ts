"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { compressToWebP, ImageTooLargeError } from "@/lib/utils/image";

const MAX_PHOTOS_PER_HIKE = 10;

type UploadSuccess = { ok: true; photos: { id: string; signedUrl: string }[] };
type UploadError = { ok: false; error: string };

export async function uploadHikePhotos(
  hikeId: string,
  formData: FormData
): Promise<UploadSuccess | UploadError> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Verify hike ownership
  const { data: hike } = await supabase
    .from("hikes")
    .select("id")
    .eq("id", hikeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!hike) return { ok: false, error: "Hike not found." };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  if (!files.length) return { ok: false, error: "No files provided." };

  // Count existing photos for this hike
  const { count: existing } = await supabase
    .from("hike_photos")
    .select("id", { count: "exact", head: true })
    .eq("hike_id", hikeId);

  if ((existing ?? 0) + files.length > MAX_PHOTOS_PER_HIKE) {
    return {
      ok: false,
      error: `Max ${MAX_PHOTOS_PER_HIKE} photos per hike. This hike already has ${existing ?? 0}.`,
    };
  }

  const results: { id: string; signedUrl: string }[] = [];
  let position = existing ?? 0;

  for (const file of files) {
    // Validate MIME
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: `${file.name} is not an image.` };
    }

    let compressed: Awaited<ReturnType<typeof compressToWebP>>;
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      compressed = await compressToWebP(bytes);
    } catch (err) {
      if (err instanceof ImageTooLargeError) {
        return { ok: false, error: `${file.name}: ${err.message}` };
      }
      return { ok: false, error: `Failed to compress ${file.name}.` };
    }

    const storagePath = `${user.id}/${hikeId}/${position}.webp`;

    const { error: uploadErr } = await supabase.storage
      .from("hike-photos")
      .upload(storagePath, compressed.buffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadErr) {
      // RLS policy violation = photo cap reached
      if (uploadErr.message.toLowerCase().includes("policy")) {
        return { ok: false, error: "Account photo limit reached (50 total)." };
      }
      return { ok: false, error: `Upload failed for ${file.name}.` };
    }

    const { data: row, error: insertErr } = await supabase
      .from("hike_photos")
      .insert({
        hike_id: hikeId,
        storage_path: storagePath,
        position,
        width: compressed.width,
        height: compressed.height,
      })
      .select("id")
      .single();

    if (insertErr || !row) {
      return { ok: false, error: "Failed to save photo record." };
    }

    // 24-hour signed URL for immediate client use
    const { data: signed } = await supabase.storage
      .from("hike-photos")
      .createSignedUrl(storagePath, 86_400);

    results.push({ id: row.id, signedUrl: signed?.signedUrl ?? "" });
    position++;
  }

  revalidatePath(`/hikes/${hikeId}`);
  revalidatePath("/feed");

  return { ok: true, photos: results };
}
