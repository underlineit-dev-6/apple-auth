// middleware.ts (TENANT APP)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_HOST = "auth.urstruly.xyz"?.replace(/^https?:\/\//, "");

const RESERVED = new Set(["www", "auth"]);
const STATIC_EXCLUDE =
  "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets).*)";

function normalizeHost(req: NextRequest) {
  const h =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host ||
    "";
  return h.replace(/:\d+$/, "").toLowerCase();
}

function getSubdomain(host: string) {
  if (!host) return null;
  if (host === AUTH_HOST) return null; // never set tenant on auth host
  const parts = host.split(".");
  if (parts.length < 3) return null;
  const sub = parts[0];
  return RESERVED.has(sub) ? null : sub;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = normalizeHost(req);

  // 1) Proxy ONLY /api/auth/* to the central auth host (rewrite, not redirect)
  if (url.pathname.startsWith("/api/auth/")) {
    // Avoid loops if someone accidentally deploys this middleware on the auth app
    if (host === AUTH_HOST) return NextResponse.next();

    const proxied = new URL(url); // clone
    proxied.protocol = "https:";
    proxied.hostname = AUTH_HOST;
    proxied.host = AUTH_HOST;

    // Preserve original callbackUrl etc. in query string automatically
    return NextResponse.rewrite(proxied);
  }

  // 2) Set x-tenant header for app pages (not for /api/auth/*)
  const sub = getSubdomain(host);
  const requestHeaders = new Headers(req.headers);
  if (sub) requestHeaders.set("x-tenant", sub);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Include everything except common statics; we DO want /api/auth/* to hit this file
export const config = { matcher: [STATIC_EXCLUDE] };
