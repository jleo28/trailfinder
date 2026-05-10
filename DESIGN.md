# DESIGN.md — TrailFinder

## Identity

TrailFinder sits visually between an editorial outdoor magazine and a modern productivity tool. Picture Sierra Club's print quarterly redesigned by the Linear team. The interface should feel calm, slightly atmospheric, and rooted in the natural world without veering into woodgrain-and-leather REI territory or neon-route-overlay Strava territory.

Two lenses to test every design decision against:

- Does it feel like a place to plan a Saturday morning hike, not a workout app?
- Does it look intentional rather than templated?

If a screen passes both, ship it. If not, it gets revised before merging.

## Theme system

Four user-selectable theme modes:

1. **Time-of-day (default).** Local timezone. Light from 6am to 6pm, dark from 6pm to 6am. Crossfades at the boundary with a 400ms transition (no flash). Stored as `theme: "auto"`.
2. **Light fixed.** `theme: "light"`.
3. **Dark fixed.** `theme: "dark"`.
4. **System.** Follows `prefers-color-scheme`. `theme: "system"`.

Theme picker UI: a single icon button in the header that opens a 4-option dropdown. Default value is `auto`. Show a subtle indicator (small sun/moon glyph next to the active option) so users know what mode they're in.

### Implementation note

Use `data-theme` on `<html>` driven by a client-side resolver that runs on mount. To prevent FOUC, ship a tiny inline script in `<head>` that reads localStorage and applies the resolved theme before paint. Same pattern as `next-themes` but hand-rolled to avoid the dependency.

Re-resolve `auto` mode every minute via `setInterval` so the theme flips at 6pm even if the user keeps the tab open all day.

## Color

The palette pulls from sage (the dominant accent green) and mushroom/taupe (the neutral foundation). Stone gray supports for cooler UI surfaces. No pure black or pure white anywhere, every neutral is warm-tinted.

### Sage scale (accent)

| Token | Hex | HSL |
|---|---|---|
| sage-50 | `#F4F6F1` | `hsl(80, 22%, 95%)` |
| sage-100 | `#E8ECE0` | `hsl(82, 25%, 90%)` |
| sage-200 | `#D1D9C2` | `hsl(82, 25%, 80%)` |
| sage-300 | `#B0BC9C` | `hsl(85, 21%, 67%)` |
| sage-400 | `#8B9B76` | `hsl(82, 19%, 54%)` |
| **sage-500** | `#6E7E5C` | `hsl(85, 16%, 43%)` ← brand accent |
| sage-600 | `#57674A` | `hsl(85, 17%, 35%)` |
| sage-700 | `#424F38` | `hsl(88, 18%, 26%)` |
| sage-800 | `#2F3A29` | `hsl(95, 18%, 19%)` |
| sage-900 | `#1F271A` | `hsl(98, 23%, 13%)` |

### Mushroom/Taupe scale (neutral foundation)

| Token | Hex | HSL |
|---|---|---|
| mushroom-50 | `#F8F5EF` | `hsl(40, 33%, 95%)` |
| mushroom-100 | `#EFEBE1` | `hsl(43, 26%, 91%)` |
| mushroom-200 | `#DDD5C5` | `hsl(40, 24%, 82%)` |
| mushroom-300 | `#C2B6A0` | `hsl(38, 22%, 70%)` |
| mushroom-400 | `#A6987F` | `hsl(36, 17%, 58%)` |
| mushroom-500 | `#847762` | `hsl(35, 15%, 45%)` |
| mushroom-600 | `#645A48` | `hsl(35, 16%, 34%)` |
| mushroom-700 | `#443E32` | `hsl(36, 14%, 23%)` |
| mushroom-800 | `#2B271F` | `hsl(38, 16%, 15%)` |
| mushroom-900 | `#1A1814` | `hsl(40, 12%, 9%)` |

### Stone (supporting cool gray, used sparingly)

| Token | Hex | HSL |
|---|---|---|
| stone-100 | `#F4F4F2` | `hsl(60, 8%, 95%)` |
| stone-300 | `#C7C5BF` | `hsl(50, 7%, 76%)` |
| stone-500 | `#7E7B73` | `hsl(40, 5%, 47%)` |
| stone-700 | `#4B4943` | `hsl(40, 6%, 28%)` |
| stone-900 | `#1E1D1A` | `hsl(40, 6%, 11%)` |

### Semantic tokens

Components reference semantic tokens, never raw scale values. This is what makes theme switching trivial.

**Light mode:**

```css
:root {
  --bg: #F8F5EF;            /* mushroom-50 */
  --bg-elevated: #FDFBF6;   /* warmer near-white */
  --surface: #FFFFFF;
  --surface-muted: #F3F0E8;
  --border: #DDD5C5;        /* mushroom-200 */
  --border-strong: #C2B6A0; /* mushroom-300 */
  --text: #1F271A;          /* sage-900 */
  --text-soft: #443E32;     /* mushroom-700 */
  --text-muted: #847762;    /* mushroom-500 */
  --accent: #6E7E5C;        /* sage-500 */
  --accent-hover: #57674A;
  --accent-soft: #E8ECE0;   /* sage-100 */
  --accent-on: #FFFFFF;
  --danger: #A14A3A;
  --warning: #B5854F;
  --success: #6E7E5C;
}
```

**Dark mode:**

```css
[data-theme="dark"] {
  --bg: #16140F;            /* deeper than mushroom-900, almost black-warm */
  --bg-elevated: #1F1C16;
  --surface: #25221B;
  --surface-muted: #1A1814;
  --border: #2F2B22;
  --border-strong: #443E32; /* mushroom-700 */
  --text: #EFEBE1;          /* mushroom-100 */
  --text-soft: #C2B6A0;     /* mushroom-300 */
  --text-muted: #847762;    /* mushroom-500 */
  --accent: #8B9B76;        /* sage-400, brighter on dark */
  --accent-hover: #B0BC9C;
  --accent-soft: rgba(139, 155, 118, 0.14);
  --accent-on: #16140F;
  --danger: #C76A57;
  --warning: #C99963;
  --success: #8B9B76;
}
```

### Use rules

- Body text uses `--text`. Secondary text uses `--text-soft`. Captions, metadata, timestamps use `--text-muted`.
- Card surfaces use `--surface`. Page bg uses `--bg`. Floating panels (modals, dropdowns) use `--bg-elevated`.
- Sage accent appears on: primary CTAs, active nav state, friend activity badges, "trail completed" stamps. Don't use it for inline body links (those use underline + `--text`).
- Avoid using sage at large fills, it gets oppressive. Sage is for accents, not surfaces.

## Typography

### Fonts

- **Sans, Inter.** Body, UI, labels, all interactive elements. Weights 400/500/600.
- **Serif, Fraunces.** Trail names, page titles, blockquotes, "trail of the week" headlines. Variable font, use weights 400 and 600 with the `SOFT` axis at ~50 for warmth. This is the move that distinguishes the app from a Tailwind template.
- **Mono, JetBrains Mono.** Distance, elevation gain, time stamps, coordinates. Slightly more character than IBM Plex Mono.

Load via `next/font` from Google Fonts. Preload sans and serif. Lazy-load mono.

### Scale

Mobile = base, desktop scales via `clamp()`.

| Token | Size | Usage |
|---|---|---|
| xs | 0.75rem (12px) | labels, mono timestamps |
| sm | 0.875rem (14px) | captions, metadata |
| base | 1rem (16px) | body |
| lg | 1.125rem (18px) | prose, larger body |
| xl | 1.25rem (20px) | small headings |
| 2xl | 1.5rem (24px) | card titles, section headers |
| 3xl | clamp(1.75rem, 3vw, 2.25rem) | page titles |
| 4xl | clamp(2.25rem, 5vw, 3.5rem) | hero headings |
| 5xl | clamp(3rem, 7vw, 5rem) | display (rare) |

### Pairing rules

- Trail name on a trail card: Fraunces 500 at 2xl, line-height 1.15.
- Trail name on detail page hero: Fraunces 600 at 4xl with letter-spacing -0.02em.
- Stats next to a trail name (distance, elevation): JetBrains Mono 400 at sm in `--text-muted`.
- Body prose (descriptions, hike notes): Inter 400 at base, line-height 1.65, max-width 65ch.
- UI labels (button text, nav, form labels): Inter 500 at sm, letter-spacing 0.01em, sometimes uppercase with letter-spacing 0.06em for section labels.

## Spacing

4px base unit, Tailwind-style scale.

| Token | px |
|---|---|
| 0.5 | 2 |
| 1 | 4 |
| 1.5 | 6 |
| 2 | 8 |
| 3 | 12 |
| 4 | 16 |
| 5 | 20 |
| 6 | 24 |
| 8 | 32 |
| 10 | 40 |
| 12 | 48 |
| 16 | 64 |
| 20 | 80 |
| 24 | 96 |

Section vertical padding: `py-16` (64px) mobile, `py-24` (96px) desktop.
Card internal padding: `p-5` (20px) compact, `p-6` (24px) default.
Page max-width: 1200px for content-heavy pages, 1440px for map-heavy pages.

## Radius

| Token | px | Usage |
|---|---|---|
| sm | 6 | chips, tags, small inputs |
| md | 10 | buttons, search bars, inputs |
| lg | 14 | cards, modals |
| xl | 20 | large feature surfaces, photo containers |
| 2xl | 28 | hero photo cards |
| full | 9999 | pills, avatars |

## Shadow

Layered, soft, slightly warm. No hard cast shadows.

```css
:root {
  --shadow-sm: 0 1px 2px rgba(31, 39, 26, 0.04);
  --shadow-md: 0 2px 8px rgba(31, 39, 26, 0.06), 0 1px 2px rgba(31, 39, 26, 0.04);
  --shadow-lg: 0 12px 32px rgba(31, 39, 26, 0.08), 0 4px 12px rgba(31, 39, 26, 0.04);
  --shadow-xl: 0 24px 64px rgba(31, 39, 26, 0.12), 0 8px 24px rgba(31, 39, 26, 0.06);
}

[data-theme="dark"] {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 24px 64px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4);
}
```

## Glassmorphism (medium intensity)

Used **only on floating UI**: map controls, search overlay, modal backdrops, command palette. Never on static cards or page sections.

```css
.glass {
  background: rgba(248, 245, 239, 0.72);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(221, 213, 197, 0.6);
  box-shadow: var(--shadow-md);
}

[data-theme="dark"] .glass {
  background: rgba(22, 20, 15, 0.72);
  border: 1px solid rgba(68, 62, 50, 0.6);
}
```

Why these values: `blur(16px) saturate(140%)` is enough to pop against trail photography without making text illegible. `0.72` alpha keeps content readable while showing the photo through. The saturate boost preserves the warmth of the photo behind, so the panel doesn't wash out the imagery.

**Avoid:**

- Glass on trail cards in the feed (makes everything look the same).
- Glass on full-bleed sections (kills hierarchy).
- Stacking two glass layers (compound blur is expensive and looks muddy).
- Glass on text-heavy modals (use `--bg-elevated` solid instead).

## Motion

Every motion answers "what does this clarify?" Decorative animation is rejected.

### Tokens

```css
:root {
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --duration-map: 600ms;
}
```

### What animates

- Hover lifts on cards: `translateY(-2px)`, shadow upgrades from `sm` to `md`, 150ms ease-out.
- Modal enter: `scale(0.96) → scale(1)` + fade, 250ms ease-out. Backdrop fades in 200ms.
- Map pan/zoom: 600ms ease-in-out (Leaflet defaults are too snappy and abrupt for this aesthetic).
- Route polyline draw: animated `stroke-dashoffset` on trail detail load, 800ms ease-out.
- Theme crossfade: 400ms on `--bg`, `--text`, `--surface`.
- Page transitions: subtle fade-up (12px) on route change, 250ms.
- Tag/chip insertion: 150ms scale-in from 0.9.

Respect `prefers-reduced-motion`: disable all transforms, keep only opacity transitions at 100ms. This is non-negotiable, the photo-heavy app already moves a lot.

## Photography

Two distinct treatments based on role.

### Hero vistas

Used on: trail detail page top, homepage feature, OG share images.

- Aspect: 21:9 desktop, 16:9 mobile.
- Treatment: subtle vignette gradient at bottom (`linear-gradient(to top, rgba(22,20,15,0.65), transparent 50%)`) so overlaid trail name has contrast.
- Title sits bottom-left over the gradient: Fraunces 600 white, with mono stats underneath.
- No filters or color grading on the photo itself. The photos do the work.

### Detail crops

Used on: trail cards in feed/list, hike log thumbnails, photo grid thumbnails.

- Aspect: 4:3 for trail cards, 1:1 for hike log avatars in feed, 3:2 for hike log photos in detail.
- Treatment: subtle 4% sage-tinted overlay on hover (`bg-sage-500/4`) plus 2px lift.
- **Detail crops should show texture and foreground objects**, trail markers, switchbacks, boots, dirt, leaves, gloves on a rock. The crop choice is the visual variety. Hero is the destination, cards are the journey.

### Photo grid on trail detail page

Bento layout: one tall hero photo (left, 2:3) plus three smaller detail crops stacked (right). Mobile collapses to a single-column carousel with 3:2 frames.

### Sourcing rule

Every photo gets compressed to WebP at 1200px max width on upload (handled in ARCHITECTURE.md). Hero photos can go to 1600px since they're rare.

## Component primitives

### Button

| Variant | Specs |
|---|---|
| Primary | `bg-accent text-accent-on radius-md px-4 py-2` hover→`bg-accent-hover` |
| Secondary | `bg-transparent text-text border-1 border-border-strong radius-md` hover→`bg-surface-muted` |
| Ghost | `bg-transparent text-text-soft radius-md` hover→`bg-surface-muted` |
| Danger | `bg-danger text-white radius-md` hover→darker |

Sizes: `sm` (h-8, text-sm), `base` (h-10, text-base), `lg` (h-12, text-lg).
Disabled: 0.5 opacity, no hover states, `cursor: not-allowed`.

### Card (trail card)

- Surface bg, 1px border, radius-lg, shadow-sm.
- Hover: lifts 2px, shadow upgrades to md.
- Layout: photo (4:3) on top with 14px corner radius matching card minus 1px, body padding 5 (20px).
- Trail name in Fraunces 2xl, stats row in mono sm below.
- Difficulty chip top-right of photo (overlay), sage-100 bg with sage-700 text.

### Input

- `bg-surface-muted` in light, `bg-surface` in dark.
- Border on focus shifts to `--accent` with a 3px ring at `--accent-soft`.
- Radius-md, height 10 (40px) base.
- Placeholder uses `--text-muted`.

### Modal

- Centered, max-w-lg, radius-lg, shadow-xl.
- Backdrop is glass (medium blur on bg image or solid `bg-black/40` on plain bg).
- Close affordance top-right (X icon, ghost button).
- Enter animation as specified in Motion.

### Map popup

- Glass panel, radius-md, padding 4 (16px).
- Includes thumbnail (3:2, 80px wide), trail name (Fraunces sm), 2 stats (mono xs), "View trail →" link (accent).
- Triangle pointer to the pin uses border-strong color.

### Photo grid (trail detail bento)

- CSS Grid: 2 cols on desktop, hero spans full row 1, 3 thumbs in row 2.
- 1 col mobile carousel with snap scroll.
- All images radius-lg, 8px gap.

### Avatar

- Circle, radius-full.
- Sage-500 fallback bg with initials in white when no photo.
- Sizes: xs (24px), sm (32px), base (40px), lg (56px), xl (88px).

### Tag/chip

- Pill, radius-full, `px-3 py-1`, sage-100 bg + sage-700 text in light, `accent-soft` + `accent` in dark.
- Used for difficulty (Easy/Moderate/Hard), tags (Dog-friendly, Waterfall, Sunset, Loop, Out-and-back).
- Difficulty has a fixed color mapping: Easy→sage-300 bg, Moderate→mushroom-300 bg, Hard→`#A14A3A` bg with white text.

### Search bar

- Glass when overlaid on map. Surface-muted otherwise.
- Icon left (Lucide `Search`), input flush, no internal border.
- Triggers a command-palette-style results overlay (radix-ui or custom).
- Keyboard shortcut hint on the right: kbd-styled "⌘ K".

### Stat row

Used everywhere a trail or hike has metrics. Mono font, sm size, text-muted color, separator dot between items.

```
4.2 mi  ·  +850 ft  ·  Moderate  ·  Loop
```

## Iconography

- Lucide React. Stroke 1.5 default. 18px or 20px standard.
- Sage-500 for active states, text-muted for default, text-soft for hover.
- Topographic icons (mountain, compass, route, footprints) used liberally, leaning into the outdoor identity without going kitsch.
- Avoid emoji except in user-generated content.

## "Trail passport" visual treatment

(Future feature flag, but worth specifying now.) When a user completes a trail, generate a stamp-styled visual on their profile: rough circular border in sage-700, trail name in Fraunces inside, completion date in mono below, slightly rotated -3deg. Multiple stamps overlap on the profile page in a slightly chaotic grid, like a real passport.

This is the single highest-leverage portfolio screenshot in the app. Keep the spec tight.

## Reference sites

Pull from:

- **Linear** (linear.app) — glassmorphism intensity, motion timing, dark mode warmth.
- **AllTrails** (alltrails.com) — trail card information density, map UI, photography role.
- **Vercel** (vercel.com) — dark mode quality, type scale, button states.
- **Field Mag** (fieldmag.com) — editorial outdoor photography, serif headers, crop choices.
- **REI Co-op Journal** (rei.com/blog) — earthy palette execution, when to be quiet vs loud.
- **Fellow** (fellowproducts.com) — mushroom/sage palette in commerce context.

Avoid:

- **Strava** — we're not a fitness tracker.
- **Komoot** — too crunchy, too German-utility.
- **Patagonia.com** — too magazine-y, not interactive enough.

## Acceptance check for any new screen

Before merging, every screen passes this checklist:

1. Uses semantic tokens, no raw hex outside the token file.
2. Renders correctly in all 4 theme modes (light, dark, auto-flipped at noon and midnight, system).
3. `prefers-reduced-motion` disables transforms.
4. Type pairing follows the rules above (Fraunces only for trail names and headlines).
5. No glass on static cards or page sections.
6. Photos use the correct aspect ratio for their role.
7. Mobile breakpoint tested at 375px and 414px.
8. Lighthouse accessibility score ≥ 95 for the page.

If any item fails, it gets fixed before the PR merges.
