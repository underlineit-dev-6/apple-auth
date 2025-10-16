// middleware/tenant.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const AUTH_HOST = `auth.${BASE_DOMAIN}`;
const IS_PROD = process.env.NODE_ENV === "production";

// Which tenant routes require an active session
const PROTECTED_PATHS = [
  /^\/social-login(?:\/|$)/,
  // add more as needed:
  // /^\/app(?:\/|$)/,
  // /^\/dashboard(?:\/|$)/,
];

export async function tenantMiddleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  )
    .replace(/:\d+$/, "")
    .toLowerCase();

  // 1) Proxy ONLY /api/auth/* to auth host (unchanged)
  if (url.pathname.startsWith("/api/auth/")) {
    if (host === AUTH_HOST) return NextResponse.next();
    const proxied = new URL(url);
    proxied.protocol = "https:";
    proxied.hostname = AUTH_HOST;
    proxied.host = AUTH_HOST;
    return NextResponse.rewrite(proxied);
  }

  // 2) If this tenant route is protected, ensure session token exists; otherwise redirect to "/"
  const isProtected = PROTECTED_PATHS.some((re) => re.test(url.pathname));
  if (isProtected) {
    // Requires NEXTAUTH_SECRET in env
    const token = await getToken({
      req,
      secureCookie: IS_PROD,
    });

    if (!token) {
      const toHome = url.clone();
      toHome.pathname = "/";
      toHome.search = "";
      return NextResponse.redirect(toHome);
    }
  }

  // 3) (Optional) set x-tenant + fallback cookie (keep your current logic)
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
    secure: IS_PROD, // important: only secure in prod
    httpOnly: false,
    maxAge: 15 * 60,
  });

  return res;
}
