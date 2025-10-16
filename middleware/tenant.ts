import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_HOST = "auth.urstruly.xyz";
const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const IS_PROD = process.env.NODE_ENV === "production";
export function tenantMiddleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  )
    .replace(/:\d+$/, "")
    .toLowerCase();

  // Proxy ONLY /api/auth/* to auth host
  if (url.pathname.startsWith("/api/auth/")) {
    if (host === AUTH_HOST) return NextResponse.next();
    const proxied = new URL(url);
    proxied.protocol = "https:";
    proxied.hostname = AUTH_HOST;
    proxied.host = AUTH_HOST;
    return NextResponse.rewrite(proxied);
  }

  // Example: set x-tenant + fallback return cookie
  const parts = host.split(".");
  const sub = parts.length >= 3 ? parts[0] : null;
  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });
  if (sub && sub !== "www" && sub !== "auth") res.headers.set("x-tenant", sub);

  const fallback = `https://${host}/social-login`;
  res.cookies.set("tenant-return", fallback, {
    domain: "." + BASE_DOMAIN,
    path: "/",
    sameSite: "lax",
    secure: IS_PROD,
    httpOnly: false,
    maxAge: 15 * 60,
  });

  return res;
}
