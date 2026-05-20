"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type ReactionType = Database["public"]["Enums"]["reaction_type"];

// ── toggleReaction ────────────────────────────────────────────────────────────

export async function toggleReaction(
  hikeId: string,
  type: ReactionType
): Promise<{ ok: true; added: boolean } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("hike_id", hikeId)
    .eq("user_id", user.id)
    .eq("type", type)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    revalidatePath(`/hikes/${hikeId}`);
    return { ok: true, added: false };
  }

  const { error } = await supabase
    .from("reactions")
    .insert({ hike_id: hikeId, user_id: user.id, type });

  if (error) return { ok: false, error: "Failed to add reaction." };

  revalidatePath(`/hikes/${hikeId}`);
  return { ok: true, added: true };
}

// ── postComment ───────────────────────────────────────────────────────────────

export async function postComment(
  hikeId: string,
  text: string
): Promise<{ ok: true; commentId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Comment cannot be empty." };
  if (trimmed.length > 500) return { ok: false, error: "Comment must be under 500 characters." };

  const { data, error } = await supabase
    .from("comments")
    .insert({ hike_id: hikeId, user_id: user.id, text: trimmed })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Failed to post comment." };

  revalidatePath(`/hikes/${hikeId}`);
  return { ok: true, commentId: data.id };
}

// ── deleteComment ─────────────────────────────────────────────────────────────

export async function deleteComment(
  commentId: string,
  hikeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "Failed to delete comment." };

  revalidatePath(`/hikes/${hikeId}`);
  return { ok: true };
}
