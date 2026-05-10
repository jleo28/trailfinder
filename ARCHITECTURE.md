# ARCHITECTURE.md — TrailFinder

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage |
| Maps | Leaflet + react-leaflet + OpenStreetMap tiles |
| Hosting | Vercel (Hobby tier) |
| Image processing | `sharp` in server actions |
| OG images | `@vercel/og` |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS + CSS variables (per DESIGN.md) |
| Icons | lucide-react |

No state management library. Server actions + URL params + React Query (`@tanstack/react-query`) for client cache.

## Free-tier guardrails

The single biggest risk: **Supabase free projects pause after 7 days of inactivity**. A cold app that 502s when a recruiter clicks the link kills the whole portfolio piece.

### Mitigations

1. **Vercel cron keep-alive.** Daily cron at noon UTC hits `/api/cron/keep-alive` which runs `SELECT 1` on Supabase. Free tier allows 2 daily crons; we use 1.

   ```json
   // vercel.json
   {
     "crons": [{ "path": "/api/cron/keep-alive", "schedule": "0 12 * * *" }]
   }
   ```

   ```ts
   // app/api/cron/keep-alive/route.ts
   export async function GET(req: Request) {
     const auth = req.headers.get("authorization");
     if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
       return new Response("Unauthorized", { status: 401 });
     }
     const { error } = await supabaseAdmin.from("trails").select("id").limit(1);
     return Response.json({ ok: !error });
   }
   ```

2. **Photo budget.** Hard caps enforced in app + DB:
   - Max 50 photos per user account total.
   - Max 10 photos per logged hike.
   - Max 5MB upload size before compression.
   - All uploads compressed to WebP at 1200px max (1600px for trail heroes), EXIF stripped.
   - Estimated steady-state storage: ~500KB compressed × 2000 photos = 1GB (Supabase free cap).

3. **DB row caps.**
   - Max 3 user-submitted trails per user. Enforced via Postgres function called from RLS policy.
   - No cap on hikes logged or comments (low row cost).

4. **Bandwidth.**
   - All photos served via Vercel Image Optimization (100GB/mo free).
   - `Cache-Control: max-age=2592000, immutable` on all photo URLs (signed URLs use a long TTL).
   - Map tiles cached aggressively client-side (Leaflet handles this).

5. **Function execution.**
   - Server actions only for mutations.
   - Reads go direct to Supabase client (RLS handles auth).
   - No heavy compute in server actions; image compression caps at one image per invocation.

6. **No Realtime.**
   - Supabase Realtime is free up to 200 concurrent connections, but it eats quota fast.
   - Feed updates poll on tab focus (`refetchOnWindowFocus`) via React Query. Good enough for a portfolio app.

7. **No paid third-party services.**
   - Geocoding: OpenStreetMap Nominatim (rate-limited, must set `User-Agent`).
   - Elevation: cut from v1 (see "Cut from v1" below).
   - Email notifications: cut from v1.

## Routes

### Public

| Route | Purpose |
|---|---|
| `/` | Conditional home. Signed out: map-forward with featured trails. Signed in + has friends: feed-first. Signed in + no friends: map fallback with "find friends" CTA. |
| `/trails` | Browse all trails. Map left, filter sidebar right, trail cards grid below on mobile. |
| `/trails/[slug]` | Trail detail page. Hero photo, stats, route map, photo grid, reviews, "friends who hiked this." |
| `/u/[username]` | Public user profile. Hike count, total miles, trail passport stamps. |
| `/u/[username]/hikes` | User's logged hikes (filtered by visibility). |
| `/signin`, `/signup` | Auth pages. |
| `/about` | Credits page. Mentions original CSCI-201 teammates. |

### Authenticated

| Route | Purpose |
|---|---|
| `/feed` | Full friend feed (when `/` shows feed-first, this is just an alias). |
| `/hikes/log` | Multi-step form: pick trail → date → photos → notes. |
| `/hikes/[id]` | Single hike log detail with photos, comments, reactions. |
| `/trails/submit` | Trail submission form (capped at 3 per user). |
| `/friends` | Friend list, pending requests, search by username. |
| `/settings` | Profile, theme preference, account. |

### API

| Route | Purpose |
|---|---|
| `/api/cron/keep-alive` | Daily Supabase health check. |
| `/api/og/hike/[id]` | OG image for shared hike (1200×630, edge runtime). |
| `/api/og/trail/[slug]` | OG image for shared trail. |
| `/api/upload/photo` | Photo upload + compression endpoint (server action alternative for multi-file). |

## Data model

### Tables

#### `profiles`

Extends `auth.users`, populated via trigger on signup.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  location text,
  created_at timestamptz DEFAULT now()
);
```

#### `trails`

```sql
CREATE TYPE difficulty AS ENUM ('easy', 'moderate', 'hard');
CREATE TYPE route_type AS ENUM ('loop', 'out_and_back', 'point_to_point');

CREATE TABLE trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  difficulty difficulty NOT NULL,
  distance_mi numeric(5,2) NOT NULL,
  elevation_gain_ft integer NOT NULL DEFAULT 0,
  route_type route_type NOT NULL,
  trailhead_lat numeric(9,6) NOT NULL,
  trailhead_lng numeric(9,6) NOT NULL,
  geometry jsonb,  -- GeoJSON LineString, nullable for v1 user submissions
  tags text[] DEFAULT '{}',
  hero_photo_url text,
  submitted_by uuid REFERENCES profiles ON DELETE SET NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX trails_slug_idx ON trails(slug);
CREATE INDEX trails_location_idx ON trails(trailhead_lat, trailhead_lng);
CREATE INDEX trails_tags_idx ON trails USING GIN(tags);
```

#### `hikes`

```sql
CREATE TABLE hikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  trail_id uuid NOT NULL REFERENCES trails ON DELETE CASCADE,
  hiked_at date NOT NULL,
  duration_minutes integer,
  notes text,
  conditions text,
  visibility text NOT NULL DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX hikes_user_idx ON hikes(user_id, hiked_at DESC);
CREATE INDEX hikes_trail_idx ON hikes(trail_id, hiked_at DESC);
```

#### `hike_photos`

```sql
CREATE TABLE hike_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hike_id uuid NOT NULL REFERENCES hikes ON DELETE CASCADE,
  storage_path text NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  width integer,
  height integer,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX hike_photos_hike_idx ON hike_photos(hike_id, position);
```

#### `trail_photos`

Separate from hike photos; community-contributed gallery.

```sql
CREATE TABLE trail_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid NOT NULL REFERENCES trails ON DELETE CASCADE,
  storage_path text NOT NULL,
  is_hero boolean DEFAULT false,
  submitted_by uuid REFERENCES profiles ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
```

#### `reviews`

Star rating + text review. Separate from hike logs.

```sql
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  trail_id uuid NOT NULL REFERENCES trails ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trail_id)
);
CREATE INDEX reviews_trail_idx ON reviews(trail_id);
```

#### `friendships`

```sql
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');

CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);
CREATE INDEX friendships_addressee_idx ON friendships(addressee_id, status);
CREATE INDEX friendships_requester_idx ON friendships(requester_id, status);
```

#### `comments`

```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hike_id uuid NOT NULL REFERENCES hikes ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  text text NOT NULL CHECK (length(text) <= 500),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX comments_hike_idx ON comments(hike_id, created_at);
```

#### `reactions`

Lightweight, single-type per user per hike. Three react types: `like`, `fire`, `summit`.

```sql
CREATE TYPE reaction_type AS ENUM ('like', 'fire', 'summit');

CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hike_id uuid NOT NULL REFERENCES hikes ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  type reaction_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hike_id, user_id, type)
);
```

### Helper functions

```sql
-- Are two users friends?
CREATE OR REPLACE FUNCTION are_friends(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND ((requester_id = a AND addressee_id = b)
        OR (requester_id = b AND addressee_id = a))
  );
$$;

-- Count user-submitted trails for cap enforcement
CREATE OR REPLACE FUNCTION user_trail_count(uid uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::integer FROM trails WHERE submitted_by = uid;
$$;

-- Count user photos for cap enforcement
CREATE OR REPLACE FUNCTION user_photo_count(uid uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT COUNT(*) FROM hike_photos hp
     JOIN hikes h ON hp.hike_id = h.id WHERE h.user_id = uid)
    + (SELECT COUNT(*) FROM trail_photos WHERE submitted_by = uid)::integer;
$$;
```

## RLS policies

Enable RLS on every table. Default deny.

### `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

INSERT handled by `on_auth_user_created` trigger; no INSERT policy needed.

### `trails`

```sql
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trails are public" ON trails FOR SELECT USING (true);

CREATE POLICY "Authenticated users submit trails" ON trails
  FOR INSERT WITH CHECK (
    auth.uid() = submitted_by
    AND user_trail_count(auth.uid()) < 3
  );

CREATE POLICY "Submitters update unverified trails" ON trails
  FOR UPDATE USING (
    auth.uid() = submitted_by AND is_verified = false
  );
```

No DELETE policy. Manual via service role only.

### `hikes`

```sql
ALTER TABLE hikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hike visibility" ON hikes FOR SELECT USING (
  visibility = 'public'
  OR user_id = auth.uid()
  OR (visibility = 'friends' AND are_friends(auth.uid(), user_id))
);

CREATE POLICY "Users insert own hikes" ON hikes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own hikes" ON hikes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own hikes" ON hikes
  FOR DELETE USING (auth.uid() = user_id);
```

### `hike_photos`

Inherits visibility from parent hike via subquery.

```sql
ALTER TABLE hike_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photo visibility follows hike" ON hike_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM hikes h
    WHERE h.id = hike_photos.hike_id
      AND (
        h.visibility = 'public'
        OR h.user_id = auth.uid()
        OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
      )
  )
);

CREATE POLICY "Users insert own hike photos" ON hike_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM hikes WHERE id = hike_id AND user_id = auth.uid())
    AND user_photo_count(auth.uid()) < 50
  );

CREATE POLICY "Users delete own hike photos" ON hike_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM hikes WHERE id = hike_id AND user_id = auth.uid())
  );
```

### `trail_photos`

Public read. Insert capped.

```sql
ALTER TABLE trail_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trail photos public" ON trail_photos FOR SELECT USING (true);

CREATE POLICY "Users submit trail photos" ON trail_photos
  FOR INSERT WITH CHECK (
    auth.uid() = submitted_by
    AND user_photo_count(auth.uid()) < 50
  );
```

### `reviews`

```sql
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are public" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users write own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);
```

### `friendships`

```sql
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "See own friendships" ON friendships FOR SELECT USING (
  auth.uid() = requester_id OR auth.uid() = addressee_id
);

CREATE POLICY "Send friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee responds" ON friendships
  FOR UPDATE USING (auth.uid() = addressee_id);

CREATE POLICY "Either side cancels" ON friendships
  FOR DELETE USING (auth.uid() IN (requester_id, addressee_id));
```

### `comments`

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment visibility follows hike" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM hikes h
    WHERE h.id = comments.hike_id
      AND (
        h.visibility = 'public'
        OR h.user_id = auth.uid()
        OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
      )
  )
);

CREATE POLICY "Authenticated users comment on visible hikes" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM hikes h WHERE h.id = hike_id
        AND (
          h.visibility = 'public'
          OR h.user_id = auth.uid()
          OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
        )
    )
  );

CREATE POLICY "Comment owner or hike owner deletes" ON comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM hikes WHERE id = hike_id)
  );
```

### `reactions`

Same visibility model as comments, simpler write rules.

```sql
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reaction visibility follows hike" ON reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM hikes h
    WHERE h.id = reactions.hike_id
      AND (
        h.visibility = 'public'
        OR h.user_id = auth.uid()
        OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
      )
  )
);

CREATE POLICY "Users react on visible hikes" ON reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM hikes WHERE id = hike_id)
  );

CREATE POLICY "Users delete own reactions" ON reactions
  FOR DELETE USING (auth.uid() = user_id);
```

### Profile creation trigger

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    'user_' || substring(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Hiker')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

User completes profile (picks real username) on first onboarding screen after signup.

## API surface

Decision rules:

| Pattern | When |
|---|---|
| **Server action** | Mutations bound to a form (log hike, submit trail, post comment, send friend request). |
| **Route handler** | Cron, OG generation, anything that needs Edge runtime, public-by-design endpoints. |
| **Direct Supabase client** | Reads where RLS handles auth (feed, trail list, profile reads). Use `@supabase/ssr` for server components. |
| **Server-rendered Supabase queries** | SEO-relevant pages (trail detail, public profile). Use server components with the SSR client. |

### Specific routing

- `/`, `/trails/[slug]`, `/u/[username]`: server-rendered initial fetch via SSR Supabase client. SEO metadata generated from data.
- `/feed`, `/trails` (filtering): client-side with React Query, server prefetches initial page.
- All mutations: server actions with Zod validation.
- Photo uploads: special-case server action that streams to Supabase Storage after sharp compression.

### Server actions catalog

```
app/actions/hikes.ts
  - createHike(input: CreateHikeInput)
  - updateHike(id: string, input: UpdateHikeInput)
  - deleteHike(id: string)
  - addHikePhotos(hikeId: string, files: File[])

app/actions/trails.ts
  - submitTrail(input: SubmitTrailInput)
  - addTrailPhoto(trailId: string, file: File)

app/actions/social.ts
  - sendFriendRequest(addresseeId: string)
  - respondToRequest(id: string, accept: boolean)
  - removeFriend(friendId: string)
  - postComment(hikeId: string, text: string)
  - deleteComment(id: string)
  - toggleReaction(hikeId: string, type: ReactionType)

app/actions/profile.ts
  - updateProfile(input: ProfileInput)
  - uploadAvatar(file: File)
  - claimUsername(username: string)
```

Every action validates with Zod, calls Supabase server client, and returns `{ ok: true, data } | { ok: false, error }`. Use `revalidatePath` or `revalidateTag` to refresh affected routes.

## Component tree

```
app/
  layout.tsx                 // root, fonts, theme script
  page.tsx                   // conditional home
  globals.css

  (auth)/
    signin/page.tsx
    signup/page.tsx

  trails/
    page.tsx                 // browse + map
    [slug]/page.tsx          // trail detail
    submit/page.tsx          // submission form

  hikes/
    log/page.tsx             // multi-step log form
    [id]/page.tsx            // hike detail

  u/[username]/
    page.tsx                 // profile
    hikes/page.tsx           // user hikes list

  feed/page.tsx              // alias for / when has friends
  friends/page.tsx
  settings/page.tsx
  about/page.tsx

  api/
    cron/keep-alive/route.ts
    og/hike/[id]/route.tsx
    og/trail/[slug]/route.tsx

components/
  layout/
    Header.tsx
    ThemeSelector.tsx        // 4-way picker
    Footer.tsx
    NavMobile.tsx

  map/
    TrailMap.tsx             // dynamic-imported wrapper
    MapImpl.tsx              // react-leaflet implementation
    TrailMarker.tsx
    TrailPopup.tsx
    TrailRoute.tsx
    UserLocationMarker.tsx
    MapControls.tsx          // glass panel

  trail/
    TrailCard.tsx
    TrailGrid.tsx
    TrailFilters.tsx
    TrailHero.tsx
    TrailStats.tsx
    DifficultyChip.tsx
    TagList.tsx

  hike/
    HikeLogCard.tsx          // for feed
    HikeLogForm.tsx          // multi-step
    HikeLogDetail.tsx
    HikePhotoGrid.tsx        // bento layout
    Reactions.tsx
    Comments.tsx

  social/
    FriendList.tsx
    FriendRequest.tsx
    FriendSearch.tsx

  profile/
    ProfileHeader.tsx
    TrailPassport.tsx        // stamp grid
    UserStats.tsx

  ui/
    Button.tsx
    Card.tsx
    Input.tsx
    Modal.tsx
    Avatar.tsx
    Chip.tsx
    StatRow.tsx
    Skeleton.tsx
    CommandPalette.tsx       // cmd-k search

lib/
  supabase/
    client.ts                // browser client
    server.ts                // server component client
    admin.ts                 // service role (cron only)
  
  schemas/
    hike.ts                  // Zod schemas
    trail.ts
    profile.ts
  
  hooks/
    useTheme.ts
    useGeolocation.ts
    useUrlState.ts
  
  utils/
    image.ts                 // compression
    geo.ts                   // bounds, distance calcs
    slug.ts
```

## Leaflet integration

Leaflet imports `window` at module load. **Must dynamic-import with `ssr: false`**.

### Pattern

```tsx
// components/map/TrailMap.tsx
"use client";
import dynamic from "next/dynamic";
import MapSkeleton from "./MapSkeleton";

const MapImpl = dynamic(() => import("./MapImpl"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function TrailMap(props: Props) {
  return <MapImpl {...props} />;
}
```

### State ownership

URL is the source of truth for map viewport on `/trails`:

```
/trails?lat=34.1&lng=-118.3&zoom=11&difficulty=moderate&tags=loop,waterfall
```

- Page component reads URL on mount, hydrates initial viewport.
- Map component pushes viewport changes to URL via `router.replace` (debounced 300ms).
- Filter sidebar pushes filter changes to URL via `useTransition`.
- React Query refetches trails when URL state changes.

For trail detail pages, viewport is locked to the trail bounds, no URL state.

### Custom marker icons

Default Leaflet icons are ugly. Override with sage-colored SVG pins:

```ts
const trailIcon = L.divIcon({
  html: `<div class="trail-pin" data-difficulty="moderate">...</div>`,
  className: "",
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});
```

Style via Tailwind/CSS to match DESIGN.md tokens.

### Custom popup

Override Leaflet's default popup CSS to match glass panel spec from DESIGN.md. Use `L.popup({ className: 'glass-popup' })` and style accordingly. Render React content into the popup via `ReactDOM.createPortal`, OR just use a custom overlay component that watches map state instead of Leaflet's built-in popup (cleaner long-term).

### Tile layers

Default: OSM standard.
Optional toggle: OpenTopoMap (topographic, free, no key). Switcher in MapControls.

```ts
const tiles = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};
```

OpenTopoMap requests a usage attribution; include in MapControls.

### Route geometry rendering

Trail routes stored as GeoJSON `LineString` in `trails.geometry`. Render via `L.geoJSON` or `react-leaflet`'s `<GeoJSON>`. Animate stroke-dashoffset on initial render per DESIGN.md motion spec.

User-submitted trails: v1 doesn't support drawing routes (see Cuts). Trailhead pin only.

## Supabase Storage

### Buckets

| Bucket | Visibility | Purpose |
|---|---|---|
| `trail-photos` | public | Trail hero images, community gallery |
| `hike-photos` | private (signed URLs) | User hike log photos |
| `avatars` | public | Profile pictures |

### Path layout

```
trail-photos/{trail_id}/hero.webp
trail-photos/{trail_id}/{uuid}.webp

hike-photos/{user_id}/{hike_id}/{position}.webp

avatars/{user_id}.webp
```

### Signed URL strategy

- Public buckets: direct CDN URL, served via Vercel Image Optimization for cache + resize.
- Private hike photos: server component generates signed URL with 1-hour TTL, passes to client. URL is wrapped in `<Image>` with appropriate `loader`.

### Upload pipeline

```
Client (browser)
  → File picker, validates ≤5MB and image MIME
  → Server action `uploadHikePhotos(hikeId, formData)`
    → For each file:
      → sharp().resize(1200).webp({ quality: 80 }).toBuffer()
      → Strip EXIF (sharp does this by default with rotate())
      → Upload to Supabase Storage at hike-photos/{user_id}/{hike_id}/{position}.webp
      → Insert hike_photos row with width/height
    → Revalidate /hikes/[id] and /feed
```

Sequential, not parallel, to stay under Vercel function execution time.

### Storage RLS

```sql
-- hike-photos bucket: only owner can upload, view follows hike RLS
INSERT POLICY: storage.foldername(name)[1] = auth.uid()::text
SELECT POLICY: handled at table level via signed URLs

-- trail-photos bucket: authenticated users upload, all read
INSERT POLICY: auth.role() = 'authenticated'
SELECT POLICY: true

-- avatars bucket: only owner uploads to own folder, all read
INSERT POLICY: name = auth.uid()::text || '.webp'
SELECT POLICY: true
```

## Search

### Trail search

Postgres full-text search on `trails.name` and `trails.description`:

```sql
ALTER TABLE trails ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX trails_search_idx ON trails USING GIN(search_vector);
```

Query in app:
```sql
SELECT * FROM trails
WHERE search_vector @@ websearch_to_tsquery('english', $1)
ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', $1)) DESC;
```

### User search

Simple `ILIKE` on username/display_name with index. Cap to 10 results.

### Command palette

`cmd-k` opens a unified search across trails and users. Frontend debounces input 200ms, fires two parallel queries, merges results.

## OG image generation

Edge runtime via `@vercel/og`. Cached at the edge. Two endpoints:

- `/api/og/trail/[slug]` — trail card (1200×630)
- `/api/og/hike/[id]` — hike share card (1200×630)

Both pull from Supabase, render JSX with inline styles, return PNG.

For hike cards: photo on left half, trail name + user + date on right, sage gradient border. For trail cards: hero photo full-bleed with vignette, name overlaid, stats below.

`Cache-Control: public, max-age=3600, s-maxage=86400` on the response.

## Cuts from v1

Documented as future work in `README.md`:

| Feature | Reason |
|---|---|
| Elevation chart on trail detail | Open-Elevation is unreliable, USGS 3DEP requires per-point pre-computation. Single elevation gain number is enough for v1. |
| User route drawing on submission | Drawing UI is a project of its own. v1 submission = drop pin, fill metadata, no geometry. |
| Real-time feed updates | Polling on focus is enough for portfolio scale. |
| Email notifications | Out of scope. |
| Mobile apps / PWA install | Web-only. |
| Strava/Garmin integration | v2. |
| Threaded comments / mentions | Flat comments only. |
| Trail moderation panel | Manual via Supabase dashboard. |
| Hike route tracking (GPS) | Not a fitness app. |

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Supabase project pauses | High without cron | Daily Vercel cron keep-alive |
| Leaflet SSR crash (`window is not defined`) | Certain on first attempt | Strict `ssr: false` dynamic import + `"use client"` boundary |
| RLS policy lets unauthorized data leak | Medium | Test every policy with a non-owner test user before merge |
| Photo upload exceeds Vercel function timeout | Low at v1 scale | Sequential per-file processing, hard 5MB pre-compress cap |
| Storage hits 1GB cap | Low at portfolio scale | 50-photo per-user cap enforced at INSERT |
| Friend graph query slow at scale | Low (portfolio scale) | Indexes on friendships(addressee_id, status) and (requester_id, status); revisit if user count >1000 |
| Open-Elevation outage breaks trail detail | High | Cut elevation chart; show single number from seed data |
| OSM Nominatim rate limit on geocoding | Medium | Use only at trail submission (rare); cache results in trails.location text field |
| Custom domain doesn't get HTTPS | Low | Vercel handles automatically; verify before launch |

## Seed data plan

Source 30-40 LA-area trails from:

1. **OSM Overpass API** (primary): query for `way[highway=path]` and `way[route=hiking]` in LA bounding box. Free, legal. Returns name, geometry as LineString, sometimes difficulty tags.
2. **Manual curation** (fill gaps): popular trails missing OSM tags get added by hand from personal experience and public trail descriptions (Sierra Club's website is well-tagged).
3. **Photos**: Unsplash API for free trail photography (use `?content_safety=high&query=hiking+california`). Credit per Unsplash license.

**Do NOT scrape AllTrails.** Their TOS forbids it; their data is also their moat.

Build a seed script `scripts/seed-trails.ts` that:
1. Fetches Overpass API.
2. Filters to ~40 trails with names, distances, geometry.
3. Manually augments with difficulty/tags via a CSV that lives in `data/trail-overrides.csv`.
4. Pulls hero photos from Unsplash.
5. Inserts via Supabase service role.

Run once locally, commit nothing about API keys to the repo.

## Deployment

- `main` → Vercel production (`trailfinder.vercel.app`, eventually a custom subdomain or path on `jleo.me`).
- `develop` → Vercel preview.
- `feature/*` → preview deploys per branch.
- Environment variables in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - `CRON_SECRET`
  - `UNSPLASH_ACCESS_KEY` (seed only, not deployed)

## Embedding on jleo.me

Goal: live demo embedded on the personal site. Two options:

1. **iframe embed** with `trailfinder.vercel.app` in a styled container on the projects page. Simplest. Some auth flows are awkward in iframes.
2. **Linked card with screenshots** + "Open live demo →" button. More portfolio-friendly. Recommended.

Build for option 2; revisit if option 1 makes sense after launch.

## Acceptance check

Architecture is sound when:

1. RLS policies tested with a non-owner test user. Cannot read private hikes, cannot exceed caps.
2. Cron keep-alive runs successfully for 7 days (Vercel logs show 200 responses).
3. Map renders in production build without `window` errors.
4. Photo upload pipeline completes under 8s for a 5MB JPEG.
5. Trail detail page server-renders with full SEO metadata (`og:image`, `og:title`, etc.).
6. All migrations are idempotent and live in `supabase/migrations/`.
