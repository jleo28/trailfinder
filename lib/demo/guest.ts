import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ─── Guest demo world ────────────────────────────────────────────────────────
// One shared guest account plus three demo friends with seeded hikes, so a
// visitor can click "Try as guest" and immediately see the feed, friends list
// and reactions. No passwords exist for these accounts: sign-in goes through a
// server-generated magic-link token (see signInAsGuest). The daily cron calls
// resetDemoWorld() to wipe whatever visitors changed.

export const GUEST_EMAIL = "guest@demo.jleo.me";

const DEMO_PEOPLE = [
  { email: GUEST_EMAIL, username: "guest_hiker", display_name: "Guest Hiker", bio: "Just looking around. Everything here resets daily." },
  { email: "maya@demo.jleo.me", username: "maya_trails", display_name: "Maya Chen", bio: "Sunrise summits only." },
  { email: "diego@demo.jleo.me", username: "diego_peaks", display_name: "Diego Ramírez", bio: "Chasing waterfalls in the Gabriels." },
  { email: "priya@demo.jleo.me", username: "priya_walks", display_name: "Priya Nair", bio: "Griffith regular, dog in tow." },
] as const;

// hike templates: [friend index, days ago, minutes, notes, conditions]
const HIKES: [number, number, number, string, string][] = [
  [1, 1, 150, "Beat the marine layer to the top. Totally worth the 5am alarm.", "Clear above 2,000 ft"],
  [2, 2, 210, "Falls were running strong after last week's rain.", "Muddy creek crossings"],
  [3, 3, 75, "Quick after-work loop with Mochi. Observatory lights at dusk.", "Dry, crowded at the top"],
  [1, 6, 120, "Wildflowers starting to show on the south slope.", "Warm, bring extra water"],
  [2, 9, 240, "Long day but the ridge views were unreal.", "Windy on the exposed sections"],
  [0, 4, 95, "My first logged hike on TrailFinder!", "Perfect weather"],
];

const COMMENTS: [number, number, string][] = [
  // [hike index, author index, text]
  [0, 0, "That view is unreal, adding this to my list."],
  [0, 2, "5am?? Respect."],
  [2, 1, "Mochi is the real MVP of this trail."],
  [5, 1, "Welcome to the trails!"],
];

const REACTIONS: [number, number, "like" | "fire" | "summit"][] = [
  [0, 0, "summit"], [0, 3, "fire"], [1, 0, "fire"], [1, 1, "like"],
  [2, 2, "like"], [3, 3, "summit"], [5, 2, "fire"], [5, 3, "like"],
];

type Admin = ReturnType<typeof getSupabaseAdmin>;

async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  // Demo accounts are few; page through users until found.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(admin: Admin, person: (typeof DEMO_PEOPLE)[number]): Promise<string> {
  let id = await findUserIdByEmail(admin, person.email);
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      email_confirm: true,
      user_metadata: { display_name: person.display_name, demo: true },
    });
    if (error) throw error;
    id = data.user.id;
  }
  // The signup trigger gives every new user an auto "user_xxxx" username;
  // overwrite it so the demo accounts skip onboarding.
  const { error } = await admin
    .from("profiles")
    .upsert({ id, username: person.username, display_name: person.display_name, bio: person.bio, location: "Los Angeles, CA" });
  if (error) throw error;
  return id;
}

/** Rebuilds the demo world from scratch. Safe to call repeatedly. */
export async function resetDemoWorld(): Promise<string> {
  const admin = getSupabaseAdmin();
  const ids: string[] = [];
  for (const p of DEMO_PEOPLE) ids.push(await ensureUser(admin, p));
  const guestId = ids[0]!;
  const idAt = (i: number) => ids[i]!;

  // Wipe everything the demo accounts own or are part of. Comments, reactions
  // and photos on their hikes cascade with the hikes.
  await admin.from("hikes").delete().in("user_id", ids);
  await admin.from("comments").delete().in("user_id", ids);
  await admin.from("reactions").delete().in("user_id", ids);
  await admin.from("reviews").delete().in("user_id", ids);
  await admin.from("trails").delete().in("submitted_by", ids).eq("is_verified", false);
  await admin.from("friendships").delete().or(`requester_id.in.(${ids.join(",")}),addressee_id.in.(${ids.join(",")})`);

  // Guest is friends with all three demo friends.
  const now = new Date().toISOString();
  const { error: fErr } = await admin.from("friendships").insert(
    ids.slice(1).map((friendId) => ({ requester_id: friendId, addressee_id: guestId, status: "accepted" as const, accepted_at: now }))
  );
  if (fErr) throw fErr;

  // Pick verified trails to hang hikes on.
  const { data: trails, error: tErr } = await admin
    .from("trails").select("id").eq("is_verified", true).order("created_at").limit(HIKES.length);
  if (tErr) throw tErr;
  if (!trails?.length) return guestId;

  const day = 86_400_000;
  const { data: hikes, error: hErr } = await admin
    .from("hikes")
    .insert(
      HIKES.map(([who, daysAgo, minutes, notes, conditions], i) => ({
        user_id: idAt(who),
        trail_id: trails[i % trails.length]!.id,
        hiked_at: new Date(Date.now() - daysAgo * day).toISOString().slice(0, 10),
        duration_minutes: minutes,
        notes,
        conditions,
        visibility: "friends",
        created_at: new Date(Date.now() - daysAgo * day).toISOString(),
      }))
    )
    .select("id");
  if (hErr) throw hErr;

  await admin.from("comments").insert(
    COMMENTS.map(([h, who, text]) => ({ hike_id: hikes[h]!.id, user_id: idAt(who), text }))
  );
  await admin.from("reactions").insert(
    REACTIONS.map(([h, who, type]) => ({ hike_id: hikes[h]!.id, user_id: idAt(who), type }))
  );

  return guestId;
}

/** Ensures the guest account exists without wiping visitor activity. */
export async function ensureGuest(): Promise<void> {
  const admin = getSupabaseAdmin();
  const guestId = await findUserIdByEmail(admin, GUEST_EMAIL);
  if (!guestId) {
    await resetDemoWorld();
    return;
  }
  const { count } = await admin
    .from("friendships").select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${guestId},addressee_id.eq.${guestId}`);
  if (!count) await resetDemoWorld();
}

/** Returns a one-time token the server exchanges for a guest session. */
export async function createGuestToken(): Promise<string> {
  await ensureGuest();
  const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
    type: "magiclink",
    email: GUEST_EMAIL,
  });
  if (error) throw error;
  return data.properties.hashed_token;
}

export function isGuestEmail(email: string | null | undefined) {
  return email === GUEST_EMAIL;
}
