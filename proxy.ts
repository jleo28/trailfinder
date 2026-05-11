import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that require an authenticated session.
// Prefix-matched: /hikes/log covers /hikes/log/... etc.
const PROTECTED_PREFIXES = [
  "/feed",
  "/hikes/log",
  "/friends",
  "/settings",
  "/trails/submit",
  "/onboarding",
];

// Auth pages — redirect away if already signed in
const AUTH_PATHS = ["/signin", "/signup"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export async function proxy(request: NextRequest) {
  // Build a mutable response so Supabase can write refreshed session cookies.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          // Write to the request so downstream server components see them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Re-create the response so we can write to its cookies too
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: call getUser() before any conditional logic — this is what
  // triggers the session refresh and writes updated cookies to `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Unauthenticated → redirect to sign in ────────────────────────────────
  if (!user && isProtected(pathname)) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/signin";
    dest.searchParams.set("redirect", pathname);
    return NextResponse.redirect(dest);
  }

  // ── Authenticated on auth pages → redirect home (or to ?redirect param) ──
  if (user && AUTH_PATHS.includes(pathname)) {
    const redirectTo = request.nextUrl.searchParams.get("redirect");
    const dest = request.nextUrl.clone();
    dest.pathname = safeRedirect(redirectTo);
    dest.searchParams.delete("redirect");
    return NextResponse.redirect(dest);
  }

  // Return the (potentially cookie-updated) response for normal requests
  return response;
}

// Only allow relative, same-origin redirects to prevent open-redirect attacks
function safeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
