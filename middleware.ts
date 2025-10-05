// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const AUTH_HOST = `auth.${BASE_DOMAIN}`;

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const host = (req.headers.get("host") || "").split(":")[0];

  // If NextAuth routes are requested on a tenant host, bounce to auth.<domain>
  const isNextAuthRoute =
    url.pathname === "/api/auth" ||
    url.pathname.startsWith("/api/auth/signin") ||
    url.pathname.startsWith("/api/auth/callback") ||
    url.pathname.startsWith("/api/auth/verify-request") ||
    url.pathname.startsWith("/api/auth/session");

  if (host !== AUTH_HOST && isNextAuthRoute) {
    url.hostname = AUTH_HOST;
    url.protocol = "https:";
    url.port = "";
    // 307 preserves method/body if any POST is used
    return NextResponse.redirect(url, 307);
  }

  // …keep your existing tenant header/cookie logic here…
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
