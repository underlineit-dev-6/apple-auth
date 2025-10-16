// middleware/tenant.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const AUTH_HOST = `auth.${BASE_DOMAIN}`;
const IS_PROD = process.env.NODE_ENV === "production";

const SESSION_COOKIE = IS_PROD
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

// Tenant routes that must have a session
const PROTECTED_PATHS = [
  /^\/social-login(?:\/|$)/,
  // add more: /^\/app(?:\/|$)/, /^\/dashboard(?:\/|$)/, etc.
];

export function tenantMiddleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  )
    .replace(/:\d+$/, "")
    .toLowerCase();

  // 1) Proxy ONLY /api/auth/* to auth host
  if (url.pathname.startsWith("/api/auth/")) {
    if (host === AUTH_HOST) return NextResponse.next();
    const proxied = new URL(req.url);
    proxied.protocol = "https:";
    proxied.hostname = AUTH_HOST;
    proxied.host = AUTH_HOST;
    return NextResponse.rewrite(proxied);
  }

  // 2) Redirect protected paths to "/" when session cookie is missing
  const isProtected = PROTECTED_PATHS.some((re) => re.test(url.pathname));
  if (isProtected) {
    const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
    if (!hasSession) {
      return NextResponse.redirect(new URL("/", req.url)); // stay on same tenant, go home
    }
  }

  // 3) Optional: set x-tenant and a fallback cookie (only for real tenant hosts)
  const parts = host.split(".");
  const sub = parts.length >= 3 ? parts[0] : null;

  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });
  if (sub && sub !== "www" && sub !== "auth") res.headers.set("x-tenant", sub);

  // Only set tenant-return if the host is under the base domain (avoids dev/localhost issues)
  if (host === BASE_DOMAIN || host.endsWith("." + BASE_DOMAIN)) {
    const fallback = `https://${host}/social-login`;
    res.cookies.set("tenant-return", fallback, {
      domain: "." + BASE_DOMAIN,
      path: "/",
      sameSite: "lax",
      secure: IS_PROD, // not secure in dev so the cookie actually sticks
      httpOnly: false,
      maxAge: 15 * 60,
    });
  }

  return res;
}
