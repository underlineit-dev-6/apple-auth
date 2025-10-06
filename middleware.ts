// middleware.ts (TENANT APP)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_HOST = "auth.urstruly.xyz".replace(/^https?:\/\//, "");
// fallback

const RESERVED = new Set(["www", "auth"]);

function normalizeHost(req: NextRequest) {
  const h =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host ||
    "";
  return h.replace(/:\d+$/, "").toLowerCase();
}

function getSubdomain(host: string) {
  if (!host || host === AUTH_HOST) return null;
  const parts = host.split(".");
  if (parts.length < 3) return null;
  const sub = parts[0];
  return RESERVED.has(sub) ? null : sub;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = normalizeHost(req);

  // 1) Proxy ONLY /api/auth/* to central auth (rewrite, not redirect)
  if (url.pathname.startsWith("/api/auth/")) {
    if (host === AUTH_HOST) return NextResponse.next(); // safety: no loop on auth host

    const proxied = new URL(url);
    proxied.protocol = "https:";
    proxied.hostname = AUTH_HOST;
    proxied.host = AUTH_HOST;

    return NextResponse.rewrite(proxied);
  }

  // 2) Set x-tenant header for app routes
  const sub = getSubdomain(host);
  const requestHeaders = new Headers(req.headers);
  if (sub) requestHeaders.set("x-tenant", sub);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ⬇️ Must be a literal, no variables
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets).*)",
  ],
};
