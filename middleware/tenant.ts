import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const AUTH_HOST = `auth.${BASE_DOMAIN}`;

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

    // ⬇️ Forward original headers + attach x-tenant-origin for the auth app
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-origin", host);

    return NextResponse.rewrite(proxied, {
      request: { headers: requestHeaders },
    });
  }

  const parts = host.split(".");
  const sub = parts.length >= 3 ? parts[0] : null;

  // ⬇️ Clone request headers and attach x-tenant for the app to consume
  const requestHeaders = new Headers(req.headers);
  if (sub && sub !== "www" && sub !== "auth") {
    requestHeaders.set("x-tenant", sub);
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders }, // <-- important
  });

  // ❌ Do NOT set res.headers.set("x-tenant", ...) — app won’t see it.

  // Set a fallback return URL for post-auth once per visit window
  if (!req.cookies.get("tenant-return")) {
    const fallback = `https://${host}/social-login`;
    res.cookies.set("tenant-return", fallback, {
      domain: "." + BASE_DOMAIN,
      path: "/",
      sameSite: "lax",
      secure: true,
      httpOnly: false,
      maxAge: 15 * 60,
    });
  }

  return res;
}
