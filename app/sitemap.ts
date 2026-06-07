import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://trailfinder.jleo.me"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: trails }, { data: profiles }] = await Promise.all([
    supabase.from("trails").select("slug, created_at").order("name"),
    supabase.from("profiles").select("username, created_at"),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    { url: BASE, priority: 1.0, changeFrequency: "daily" },
    { url: `${BASE}/trails`, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE}/about`, priority: 0.3, changeFrequency: "yearly" },
  ];

  const trailUrls: MetadataRoute.Sitemap = (trails ?? []).map((t) => ({
    url: `${BASE}/trails/${t.slug}`,
    lastModified: t.created_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const profileUrls: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${BASE}/u/${p.username}`,
    lastModified: p.created_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticUrls, ...trailUrls, ...profileUrls];
}
