# PLAN.md — TrailFinder Execution Plan

## How to use this document

This is the ordered task list for Sonnet (in Claude Code) to execute against. Each task is one atomic commit. Each has an acceptance criterion. Don't skip ahead, dependencies are tracked per task.

Sonnet should:

1. Read DESIGN.md and ARCHITECTURE.md first.
2. Work tasks in order unless dependencies allow parallel work (flagged).
3. Open a `feature/T-XX-shortname` branch per task.
4. Commit, push, open PR against `develop`.
5. After self-review against the acceptance criterion, merge.
6. Move to next task.

Sessions are scoped to "until you hit a natural stopping point or 5 tasks done." Don't try to do the whole plan in one session.

## Estimates

- **Total tasks:** 47
- **Estimated sessions:** 18-22 (assume 2-3 tasks per Claude Code session, harder ones go solo)
- **Calendar time:** 4-6 weeks part-time, 2 weeks full-time
- **Demoable milestones:** end of Phase 2 (week 1-2), end of Phase 4 (week 3-4)

## Build order rationale

Demoable as early as possible. By end of Phase 2, you have a working trail browser with map and detail pages. Phases 3-5 layer in social features. Phase 6 is polish.

If time runs out: ship through Phase 4, cut Phase 5 (user submissions) and Phase 6 (passport stamps + polish). Phase 4 alone is a complete portfolio piece.

---

## Phase 0: Foundation (Tasks 1-5)

### T-01 — Repo init + tooling
**Branch:** `feature/T-01-init`
**Depends on:** none

Create new GitHub repo `trailfinder`. Locally:

```
npx create-next-app@latest trailfinder --typescript --tailwind --app --no-src-dir
cd trailfinder
```

Install: `@supabase/supabase-js`, `@supabase/ssr`, `react-leaflet`, `leaflet`, `@types/leaflet`, `lucide-react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@tanstack/react-query`, `sharp`, `next/font`.

Dev: `prettier`, `eslint-config-prettier`.

Configure `tsconfig.json` strict mode. Add `.env.local.example`. Set up `prettier.config.js` to match jleo.me style. Add README skeleton with a section crediting original CSCI-201 teammates.

Commit `chore: initialize Next.js 14 project with Tailwind and TS`.

**Acceptance:** `npm run dev` shows the default Next.js page. `npm run lint` and `npm run build` both pass.

---

### T-02 — Design tokens + globals.css
**Branch:** `feature/T-02-design-tokens`
**Depends on:** T-01

Translate DESIGN.md into Tailwind config + CSS variables. Create:

- `app/globals.css` with the full set of CSS variables (light + dark, both palettes).
- `tailwind.config.ts` extending the theme with sage, mushroom, stone scales, semantic color tokens that reference CSS vars, font families (Inter, Fraunces, JetBrains Mono), shadow tokens, radius tokens, easing tokens.
- Inline theme-init script in `app/layout.tsx`'s `<head>` to prevent FOUC.
- Body uses Inter, headings utility class for Fraunces.

**Acceptance:** A test page with `bg-bg text-text` renders correctly in both light and dark by toggling `data-theme="dark"` on `<html>`. No FOUC on hard reload.

---

### T-03 — Theme system (4-mode picker)
**Branch:** `feature/T-03-theme`
**Depends on:** T-02

Build the theme resolver per DESIGN.md:

- `lib/hooks/useTheme.ts` exposing `theme`, `setTheme`, `resolvedTheme`.
- Modes: `auto` (time-of-day), `light`, `dark`, `system`. Default `auto`.
- Persists to `localStorage`, `setInterval` re-resolve every minute for `auto`.
- `components/layout/ThemeSelector.tsx` dropdown with sun/moon/clock/monitor icons via Lucide.
- `prefers-color-scheme` listener for `system` mode.
- Crossfade transition on `--bg`, `--text`, `--surface` (400ms).

**Acceptance:** All four modes work. `auto` flips at 6am/6pm. Hard reload at 11pm in `auto` mode loads dark immediately (no flash).

---

### T-04 — Supabase project + migrations setup
**Branch:** `feature/T-04-supabase-setup`
**Depends on:** T-01

Create new Supabase project (free tier). In repo:

- `supabase/` directory using Supabase CLI.
- `supabase/migrations/0001_init.sql` with: extensions, enums, all tables, indexes, helper functions, triggers, all RLS policies (per ARCHITECTURE.md).
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`.
- Type generation: `npm run db:types` runs `supabase gen types typescript`.
- Generated types committed to `lib/database.types.ts`.
- `.env.local.example` with required vars.

**Acceptance:** Migration applies cleanly to the project (`supabase db push`). Type generation produces a valid file. `lib/supabase/server.ts` queries return type-safe results.

---

### T-05 — Layout shell + header/footer
**Branch:** `feature/T-05-shell`
**Depends on:** T-02, T-03

- `components/layout/Header.tsx`: logo (Fraunces text "TrailFinder"), nav (Browse, Feed, Friends), theme selector, auth menu placeholder.
- `components/layout/Footer.tsx`: credits link, GitHub link, "Original CSCI-201 team: ..." line.
- `components/layout/NavMobile.tsx`: hamburger drawer, same nav.
- Updated `app/layout.tsx` wrapping children with header + footer.
- Empty placeholder `app/page.tsx`.

Header uses glass on scroll past 48px (medium spec from DESIGN.md).

**Acceptance:** Layout renders in both modes. Header glassmorphism activates on scroll. Mobile nav drawer opens/closes.

---

## Phase 1: Auth (Tasks 6-9)

### T-06 — Sign in / sign up pages
**Branch:** `feature/T-06-auth-pages`
**Depends on:** T-04, T-05

- `app/(auth)/signin/page.tsx`: email + password, "Continue with Google" button.
- `app/(auth)/signup/page.tsx`: email + password + display name.
- `lib/supabase/server.ts` server actions: `signIn`, `signUp`, `signOut`, `signInWithGoogle`.
- Zod validation, React Hook Form.
- Friendly error messages (no raw Supabase errors).
- Redirect to `/onboarding` after signup, to `/` after sign in.

**Acceptance:** Sign up creates a user and an auto-profile via trigger. Sign in works. Wrong password shows a friendly error.

---

### T-07 — Onboarding (claim username)
**Branch:** `feature/T-07-onboarding`
**Depends on:** T-06

- `app/onboarding/page.tsx`: single screen, claim username (3-20 chars, lowercase, underscores), set bio (optional), upload avatar (optional).
- `app/actions/profile.ts`: `claimUsername`, `updateProfile`, `uploadAvatar` with sharp compression.
- Username availability check (debounced).
- Redirect to `/` on completion.

**Acceptance:** New user gets routed to onboarding. Username uniqueness enforced. Avatar uploads to Supabase Storage, displays on header.

---

### T-08 — Auth middleware + session refresh
**Branch:** `feature/T-08-middleware`
**Depends on:** T-06

- `middleware.ts` using `@supabase/ssr` to refresh session cookies.
- Protected routes: `/feed`, `/hikes/log`, `/friends`, `/settings`, `/trails/submit`, `/onboarding`.
- Redirect to `/signin?redirect=...` when unauthed.

**Acceptance:** Visiting `/feed` while signed out redirects to sign in. After signing in, lands on `/feed`. Session persists across page refreshes.

---

### T-09 — Header auth state
**Branch:** `feature/T-09-header-auth`
**Depends on:** T-07, T-08

Replace auth menu placeholder in header with real menu:

- Signed out: "Sign in" button (sage primary).
- Signed in: avatar dropdown with username, "Profile", "Settings", "Sign out".
- Server-rendered initial state to avoid flicker.

**Acceptance:** Header shows correct state on first paint after refresh in both signed-in and signed-out states.

---

## Phase 2: Trail browsing (Tasks 10-17) — DEMOABLE MILESTONE

### T-10 — Seed script + initial trail data
**Branch:** `feature/T-10-seed`
**Depends on:** T-04

- `scripts/seed-trails.ts` per ARCHITECTURE.md.
- `data/trail-overrides.csv` with 30-40 LA trails (manually curated: difficulty, tags, descriptions).
- Pulls geometry from OSM Overpass API.
- Pulls hero photos from Unsplash API (free tier).
- Inserts via service role client.
- README section explaining how to re-run.

**Acceptance:** `npm run seed` populates 30+ trails with names, geometry, photos, tags. All trails have hero photos.

---

### T-11 — Trail card + grid components
**Branch:** `feature/T-11-trail-card`
**Depends on:** T-02, T-10

- `components/trail/TrailCard.tsx` per DESIGN.md spec (4:3 photo, Fraunces name, mono stats, sage difficulty chip).
- `components/trail/TrailGrid.tsx`: responsive grid (1 col mobile, 2 col tablet, 3 col desktop).
- `components/trail/DifficultyChip.tsx`, `components/trail/TagList.tsx`, `components/trail/StatRow.tsx`.
- `components/ui/Skeleton.tsx` for loading states.

**Acceptance:** Storybook-style isolated test page renders a grid of seeded trails correctly in both themes. Hover lift and shadow upgrade work.

---

### T-12 — Map component (Leaflet integration)
**Branch:** `feature/T-12-map`
**Depends on:** T-02

The hardest technical task in Phase 2.

- `components/map/TrailMap.tsx` (dynamic import wrapper, `ssr: false`).
- `components/map/MapImpl.tsx` (react-leaflet implementation).
- `components/map/MapSkeleton.tsx`.
- `components/map/TrailMarker.tsx` (custom sage SVG pin via `L.divIcon`).
- `components/map/MapControls.tsx` (glass panel: zoom buttons, layer toggle, locate-me).
- Custom CSS for popups and pins per DESIGN.md.
- Leaflet CSS imported in `globals.css` (or via dynamic import).

**Acceptance:** Map renders in production build (`npm run build && npm start`). No `window is not defined` errors. Pins display, popups show. Standard + Topo tile toggle works.

---

### T-13 — Trail browse page (`/trails`)
**Branch:** `feature/T-13-trails-browse`
**Depends on:** T-11, T-12

- `app/trails/page.tsx` server component, server-renders initial trail list.
- Layout: map left (60%), trail grid right (40%) on desktop. Mobile: tabs (Map / List).
- `components/trail/TrailFilters.tsx`: difficulty checkboxes, distance range slider, elevation range slider, tag multiselect.
- URL state via `useUrlState` hook (search params).
- React Query for client-side refetch on filter change.
- Map and list stay in sync (clicking pin highlights card, hovering card highlights pin).

**Acceptance:** Filtering by difficulty=moderate and tags=loop returns correct trails. URL reflects state, share link reproduces view. Mobile tab switcher works.

---

### T-14 — Trail detail page
**Branch:** `feature/T-14-trail-detail`
**Depends on:** T-12, T-13

- `app/trails/[slug]/page.tsx` server-rendered with full SEO metadata.
- Hero photo (21:9) with vignette + Fraunces overlay name.
- Stats row (mono).
- Description prose.
- Map embed showing the route (geometry rendered as polyline with animation).
- Photo grid (bento layout per DESIGN.md).
- Reviews section placeholder (T-22).
- "Friends who hiked this" placeholder (T-26).
- "Log a hike" CTA (sage primary).

**Acceptance:** Slug routing works. Server-rendered metadata has correct `og:title`, `og:image`. Polyline draw animation runs on first paint.

---

### T-15 — Search (trails)
**Branch:** `feature/T-15-search`
**Depends on:** T-13

- Migration adding `search_vector` generated column + GIN index on `trails`.
- `components/ui/CommandPalette.tsx` with `cmd-k` shortcut.
- Trail search via `websearch_to_tsquery`.
- Result item shows thumbnail + name + difficulty chip.
- Click navigates to trail detail.

**Acceptance:** `cmd-k` opens palette. Searching "griffith" finds Griffith Park trails. Results capped at 10.

---

### T-16 — Geolocation + nearby trails
**Branch:** `feature/T-16-geolocation`
**Depends on:** T-13

- `lib/hooks/useGeolocation.ts` wrapping `navigator.geolocation`.
- "Locate me" button in MapControls.
- `app/trails/page.tsx` adds "Sort by: nearest" option (only enabled with permission).
- User location marker on map (blue dot, distinct from trail pins).
- Permission denial handled gracefully.

**Acceptance:** Allowing location centers map on user, sorts trails by distance. Denying does nothing visually wrong.

---

### T-17 — `/` home page (signed-out variant)
**Branch:** `feature/T-17-home-signed-out`
**Depends on:** T-13, T-14

For unauthenticated users, `/` shows:

- Hero with map of LA + featured trails (3 hand-picked, hero photos rotate).
- "Find your next hike" CTA → `/trails`.
- Three feature blocks: Browse, Log, Connect (with screenshots).
- Footer.

Server-rendered with cached featured trails.

**Acceptance:** Public landing page loads fast (Lighthouse perf ≥ 90). Featured trails visually pop in both themes.

---

**🎯 MILESTONE: end of Phase 2 = demoable trail browser with map and details. Could ship as a portfolio piece even if everything after gets cut.**

---

## Phase 3: Hike logging (Tasks 18-22)

### T-18 — Photo upload pipeline
**Branch:** `feature/T-18-photo-upload`
**Depends on:** T-04

- `lib/utils/image.ts`: sharp resize/compress/strip-EXIF.
- Server action `uploadHikePhotos(hikeId, formData)` — sequential per file.
- 5MB pre-compress cap, 10 photos per hike, 50 total per user (enforced via RLS function).
- Returns `{ ok, photos: [{ id, signedUrl }] }`.

**Acceptance:** Uploading a 4MB JPEG completes in under 8s, produces a 1200px WebP under 500KB. Cap enforcement returns clean error at the 51st upload.

---

### T-19 — Hike log form (multi-step)
**Branch:** `feature/T-19-log-form`
**Depends on:** T-18

- `app/hikes/log/page.tsx` with stepper: 1) pick trail (search), 2) date + duration, 3) photos, 4) notes/conditions/visibility.
- React Hook Form + Zod across steps.
- Server action `createHike` returns hike id.
- Photo upload happens after hike row exists.
- Redirect to `/hikes/[id]` on success.

**Acceptance:** Logging a hike with 3 photos saves correctly. Going back/forward in stepper preserves state. Refresh on step 3 doesn't lose data (form state persisted to sessionStorage).

---

### T-20 — Hike detail page
**Branch:** `feature/T-20-hike-detail`
**Depends on:** T-19

- `app/hikes/[id]/page.tsx`.
- Hero: trail name (links to trail), date, user (links to profile).
- Photo grid (bento).
- Notes prose.
- Conditions chip.
- "Edit" / "Delete" actions for owner.
- Reactions placeholder (T-21), Comments placeholder (T-22).

Visibility enforced by RLS — page returns 404 if user can't see it.

**Acceptance:** Public/friends/private visibility correctly hides hike from non-eligible viewers. Owner sees edit/delete.

---

### T-21 — Reactions
**Branch:** `feature/T-21-reactions`
**Depends on:** T-20

- `components/hike/Reactions.tsx`: three react buttons (like, fire, summit) with counts.
- Server action `toggleReaction`.
- Optimistic update.
- Hover shows reactor avatars (top 5).

**Acceptance:** Tapping reactions toggles instantly, persists on reload. Counts increment correctly.

---

### T-22 — Comments + reviews
**Branch:** `feature/T-22-comments-reviews`
**Depends on:** T-20, T-14

- `components/hike/Comments.tsx`: flat list, 500-char limit, server action `postComment` with optimistic.
- `components/trail/TrailReviews.tsx`: 5-star rating, optional text, one per user per trail (`UPSERT` via UNIQUE constraint).
- Reviews aggregate displayed on trail card and detail (avg rating + count).

**Acceptance:** Posting a comment shows immediately, persists. Submitting a second review for the same trail updates the first.

---

## Phase 4: Social graph (Tasks 23-29) — DEMOABLE MILESTONE

### T-23 — Friends list + search
**Branch:** `feature/T-23-friends-list`
**Depends on:** T-08

- `app/friends/page.tsx`: tabs (Friends, Requests, Find).
- `components/social/FriendList.tsx`: avatar + display name + username.
- `components/social/FriendSearch.tsx`: search by username/display_name (ILIKE).
- "Add friend" button on results.

**Acceptance:** Searching finds existing users. Adding sends a friend request (creates `pending` row).

---

### T-24 — Friend requests
**Branch:** `feature/T-24-friend-requests`
**Depends on:** T-23

- Requests tab shows pending incoming.
- Accept / Decline buttons (server actions).
- Outgoing pending shown separately ("waiting on them").
- Notification dot on header nav when incoming pending exists.

**Acceptance:** Accepting a request flips status to `accepted` and surfaces both users in each other's friend lists. Declining deletes the row.

---

### T-25 — Public profile page
**Branch:** `feature/T-25-profile`
**Depends on:** T-20

- `app/u/[username]/page.tsx`.
- Header: avatar, display name, bio, location, friend count, hike count, total miles.
- Tabs: Recent Hikes, Trails Hiked (unique trails), Stamps (placeholder for T-31).
- "Add friend" / "Friends" / "Requested" button based on relationship.

**Acceptance:** Visiting `/u/jaleo` renders correctly even when not logged in (public profile). Stats compute correctly.

---

### T-26 — "Friends who hiked this" on trail detail
**Branch:** `feature/T-26-friends-hiked`
**Depends on:** T-14, T-24

On trail detail page, query for hikes by current user's friends. Render as avatar stack with "Alex, Sam, +3 hiked this" label. Click expands to a small list of those hikes (linked).

**Acceptance:** Trails the user's friends hiked show the avatar stack. Trails no friends hiked show no section.

---

### T-27 — Feed (signed-in home variant)
**Branch:** `feature/T-27-feed`
**Depends on:** T-20, T-24

- `app/feed/page.tsx` (and conditional `/`).
- Cursor pagination (created_at desc).
- `components/hike/HikeLogCard.tsx`: avatar, trail name, date, photo grid (1-3 with overflow), reactions inline, comment count, "View hike →".
- React Query with `refetchOnWindowFocus`.
- Infinite scroll via `useInfiniteQuery`.

**Acceptance:** Feed shows recent hikes from accepted friends + own. Pagination loads next page on scroll. Refocusing tab refetches.

---

### T-28 — Conditional `/` home routing
**Branch:** `feature/T-28-home-routing`
**Depends on:** T-17, T-27

In `app/page.tsx`, server-side check:

- Not signed in → render T-17 marketing variant.
- Signed in + has accepted friends → render feed.
- Signed in + no friends → render map + featured trails + "Find friends" CTA.

**Acceptance:** All three states render correctly on first load.

---

### T-29 — Visibility controls polish
**Branch:** `feature/T-29-visibility`
**Depends on:** T-19

Across the app:

- Hike log form has clear visibility selector (radio buttons with descriptions).
- Hike detail page shows visibility badge to owner.
- Settings page has default visibility preference.

**Acceptance:** Default visibility setting flows through to new hike log form. Changing on a hike updates RLS access immediately.

---

**🎯 MILESTONE: end of Phase 4 = full social hiking app. Map browsing, hike logging, friend feed, comments, reactions, profiles. This is the portfolio-grade target.**

---

## Phase 5: User submissions (Tasks 30) — CUTTABLE

### T-30 — Trail submission flow
**Branch:** `feature/T-30-submit-trail`
**Depends on:** T-12

- `app/trails/submit/page.tsx`.
- Form: name, description, trailhead pin (drop on map), distance, elevation, difficulty, route_type, tags, optional hero photo.
- Server action `submitTrail` enforcing 3-per-user cap via RLS.
- Submitted trails marked `is_verified=false`, visible to submitter immediately.
- Verification badge on trail cards (subtle dot, "verified by TrailFinder" tooltip).

**Acceptance:** Submitting creates a trail visible on `/trails`. 4th submission attempt errors cleanly.

---

## Phase 6: Polish (Tasks 31-40)

### T-31 — Trail passport stamps
**Branch:** `feature/T-31-passport`
**Depends on:** T-25

The portfolio screenshot feature.

- `components/profile/TrailPassport.tsx`: SVG-styled stamps per DESIGN.md (sage rough border, Fraunces trail name, mono date, -3deg rotation).
- Generated from unique trails the user has hiked.
- Stamps overlap slightly on profile; hover lifts and straightens.
- Empty state: "0 trails hiked. Get out there →" linking to /trails.

**Acceptance:** A user with 8 unique hiked trails sees 8 distinct stamps in a slightly chaotic grid.

---

### T-32 — OG image generation
**Branch:** `feature/T-32-og-images`
**Depends on:** T-14, T-20

- `app/api/og/trail/[slug]/route.tsx` using `@vercel/og`, edge runtime.
- `app/api/og/hike/[id]/route.tsx`.
- Per DESIGN.md: hero photo treatment, sage gradient border, type pairings.
- Cached `s-maxage=86400`.

**Acceptance:** Sharing a trail URL on Twitter/iMessage shows a beautiful preview card.

---

### T-33 — Vercel cron keep-alive
**Branch:** `feature/T-33-cron`
**Depends on:** T-04

- `vercel.json` with daily cron at noon UTC.
- `app/api/cron/keep-alive/route.ts` with bearer auth via `CRON_SECRET`.
- Logs success/failure.

**Acceptance:** Deployed to Vercel preview, cron run shows 200 in Vercel logs after 24h.

---

### T-34 — Settings page
**Branch:** `feature/T-34-settings`
**Depends on:** T-07

- Profile edit (name, bio, location, avatar).
- Theme preference (mirrors header dropdown).
- Default hike visibility.
- "Delete account" (soft-delete, manual cleanup via dashboard).
- Sign out button.

**Acceptance:** All settings persist. Avatar update reflects in header immediately.

---

### T-35 — About + credits page
**Branch:** `feature/T-35-about`
**Depends on:** T-05

- `app/about/page.tsx`: project origin (CSCI-201 final), original team credit, tech stack badges, GitHub link, "rebuilt by Joseph Leo" link to jleo.me.
- Linked from footer.

**Acceptance:** Page renders. Original teammates' names listed verbatim per Jo's input.

---

### T-36 — Loading + error states audit
**Branch:** `feature/T-36-loading-errors`
**Depends on:** all prior phases

- Every async surface has a Skeleton or spinner.
- Every page has an `error.tsx` boundary with friendly message + retry.
- Every page has a `not-found.tsx` where appropriate.
- Empty states for: no hikes, no friends, no trails matching filter, no comments.

**Acceptance:** Manual QA pass: every "loading" and "empty" state has been encountered and looks intentional.

---

### T-37 — Mobile responsive audit
**Branch:** `feature/T-37-mobile-audit`
**Depends on:** all prior phases

Test every page at 375px and 414px. Fix:

- Map controls overlap at small widths.
- Trail card stats wrap awkwardly on narrow.
- Photo grid bento collapses to single-column carousel.
- Modal padding on small screens.
- Header nav drawer.

**Acceptance:** No horizontal scroll at 375px on any page. All interactive elements ≥ 44×44 tap target.

---

### T-38 — Accessibility audit
**Branch:** `feature/T-38-a11y`
**Depends on:** T-37

- Lighthouse a11y ≥ 95 on every public page.
- Keyboard nav works through every form, modal, dropdown.
- Focus rings visible (sage with offset).
- ARIA labels on icon buttons.
- Color contrast verified (esp. mushroom text on bg).
- `prefers-reduced-motion` disables transforms across the app.

**Acceptance:** Lighthouse score ≥ 95 a11y on `/`, `/trails`, `/trails/[slug]`, `/u/[username]`, `/feed`, `/hikes/log`.

---

### T-39 — SEO + metadata
**Branch:** `feature/T-39-seo`
**Depends on:** T-32

- `generateMetadata` on every dynamic page (trail, hike, profile).
- `robots.txt` allowing all.
- `sitemap.ts` generating from Supabase (public trails + public profiles).
- Per-page `og:image` from T-32.

**Acceptance:** Trail pages indexed-ready (good title, description, OG image). Sitemap responds.

---

### T-40 — Performance pass
**Branch:** `feature/T-40-perf`
**Depends on:** all prior

- Lighthouse perf ≥ 85 on `/` (signed out).
- Image lazy-load below the fold.
- Suspense boundaries around feed pagination.
- React Query `staleTime` tuned per route.
- Bundle analyzer pass: anything over 200KB justified.

**Acceptance:** Lighthouse perf ≥ 85 on `/` and `/trails/[slug]`.

---

## Phase 7: Launch (Tasks 41-47)

### T-41 — Custom domain + production env
**Branch:** `feature/T-41-domain`
**Depends on:** T-33

Decide: `trailfinder.jleo.me` subdomain or `jleo.me/trailfinder` rewrite.

Configure Namecheap DNS, Vercel custom domain, production env vars (Supabase prod URL, anon key, service role key, cron secret).

**Acceptance:** Domain serves with HTTPS. Env vars correct in production.

---

### T-42 — Project link on jleo.me
**Branch:** `feature/T-42-jleo-link`
**Depends on:** T-41

(Requires editing the personal site repo, not trailfinder.)

Add TrailFinder to projects section on jleo.me with: 1-line tagline, 3 screenshots, "Live demo →", "GitHub →" links. Skip iframe embed per ARCHITECTURE.md decision.

**Acceptance:** TrailFinder appears on jleo.me with working live demo link.

---

### T-43 — README + screenshots
**Branch:** `feature/T-43-readme`
**Depends on:** T-41

Full README with: hero screenshot, tagline, features list, tech stack, original CSCI-201 team credits, local setup instructions, deployment instructions, license.

5+ high-quality screenshots committed to `docs/screenshots/`.

**Acceptance:** A stranger reading the README understands what TrailFinder is in under 30 seconds.

---

### T-44 — RLS verification pass
**Branch:** `feature/T-44-rls-verify`
**Depends on:** all data tasks

Create a second test user. Verify, while signed in as test user 2, you cannot:

- See test user 1's `private` hikes.
- See test user 1's `friends`-only hikes (without being friends).
- Edit/delete test user 1's hikes, comments, reviews.
- Submit a 4th trail.
- Upload a 51st photo.

Document each test in `docs/rls-tests.md`.

**Acceptance:** All RLS expected behaviors confirmed. Doc committed.

---

### T-45 — Manual smoke test before launch
**Branch:** none — issue checklist

Run through full user journey:

1. Sign up new account.
2. Complete onboarding.
3. Browse trails with filters.
4. View trail detail.
5. Log a hike with 3 photos.
6. Edit notes on the hike.
7. Add a friend.
8. View their hike, react, comment.
9. View friend feed.
10. Submit a new trail.
11. Theme toggle in all 4 modes.
12. Sign out, sign back in.

**Acceptance:** Every step works without console errors.

---

### T-46 — Launch announcement post
**Branch:** none — content task

Write an X/LinkedIn post: "Rebuilt my CSCI-201 team project as a portfolio piece. Originally Java Servlets + custom JWT, now Next.js + Supabase. Full-stack social hiking app with map browsing, hike logging, and a friend feed." + screenshot collage + link.

**Acceptance:** Post drafted, ready to send.

---

### T-47 — Future work list
**Branch:** `feature/T-47-future`
**Depends on:** T-43

Add `FUTURE.md` to repo with the cuts from ARCHITECTURE.md (elevation, route drawing, real-time, notifications, GPS tracking, Strava integration, mobile apps), plus anything you noticed during build that you'd want in v2.

**Acceptance:** Doc committed. Linked from README.

---

## Dependency graph (high-level)

```
Phase 0 (T-01..T-05) ─┬─→ Phase 1 (T-06..T-09)
                      └─→ Phase 2 (T-10..T-17) ─┬─→ Phase 3 (T-18..T-22)
                                                ├─→ Phase 4 (T-23..T-29)
                                                │   └─→ Phase 5 (T-30) [CUTTABLE]
                                                └─→ Phase 6 (T-31..T-40) [POLISH]
                                                                          └─→ Phase 7 (T-41..T-47)
```

Phase 3 and 4 can interleave once Phase 2 is done. Phase 6 starts in parallel with late Phase 4 if Sonnet is bored.

## Cuts under time pressure

If running short:

1. **First cut:** Phase 5 (T-30, user submissions). Saves ~1 task.
2. **Second cut:** T-31 (passport stamps). Saves the polish but loses the best screenshot.
3. **Third cut:** T-32 (OG images). Default Vercel previews still work, just less pretty.
4. **Don't cut:** RLS verification (T-44), keep-alive cron (T-33), or smoke test (T-45). These are launch blockers.

Phase 4 is the floor. Anything before Phase 4 ships incomplete and isn't portfolio-worthy. Anything after Phase 4 is bonus polish.

## Handoff to Sonnet

When ready, prompt Sonnet in Claude Code with:

> Read DESIGN.md and ARCHITECTURE.md fully, then start with T-01 from PLAN.md. After each completed task, push the branch, summarize what you did and what you'd do differently, then wait for me to review before proceeding to the next task.

Don't let Sonnet batch tasks unsupervised past the first three. Even Sonnet 4.6 drifts on a long unsupervised run.
