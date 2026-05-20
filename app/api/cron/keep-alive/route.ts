import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Lightweight ping — count trails so Supabase doesn't spin down
    const { count, error } = await supabase
      .from("trails")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    console.log(`[cron] keep-alive ok — ${count} trails`);
    return Response.json({ ok: true, trails: count, ts: new Date().toISOString() });
  } catch (err) {
    console.error("[cron] keep-alive failed", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
