// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const AUTH_HOST = `auth.${BASE_DOMAIN}`;

function stripPort(host?: string | null) {
  return host ? host.split(":")[0] : null;
}

function getSubdomain(host?: string | null) {
  const hostname = stripPort(host);
  if (!hostname) return null;
  if (hostname === BASE_DOMAIN) return null;
  if (!hostname.endsWith("." + BASE_DOMAIN)) return null;
  const left = hostname.slice(0, -(BASE_DOMAIN.length + 1));
  const labels = left.split(".");
  const sub = labels[labels.length - 1] || null;
  if (!sub) return null;
  return sub === "www" || sub === "auth" ? null : sub;
}

export function middleware(req: NextRequest) {
  const hostHeader = req.headers.get("host") || "";
  const host = stripPort(hostHeader) || "";
  const isNextAuthRoute =
    req.nextUrl.pathname === "/api/auth" ||
    req.nextUrl.pathname.startsWith("/api/auth/");

  // 🔁 Force ALL NextAuth traffic to auth.<domain>
  if (host !== AUTH_HOST && isNextAuthRoute) {
    const redirectURL = new URL(req.url);
    redirectURL.hostname = AUTH_HOST;
    // keep the same scheme as incoming request (http local, https on Vercel)
    redirectURL.protocol = req.nextUrl.protocol;
    // clear port for https; keep any dev http port if present
    if (redirectURL.protocol === "https:") redirectURL.port = "";
    return NextResponse.redirect(redirectURL, { status: 307 });
  }

  // ⬇️ Your existing tenant header/cookie logic
  const tenant = getSubdomain(host);
  const headers = new Headers(req.headers);
  if (tenant) headers.set("x-tenant", tenant);

  const res = NextResponse.next({ request: { headers } });

  const cookieTenant = tenant ?? (host === AUTH_HOST ? "auth" : "");
  res.cookies.set("tenant", cookieTenant, {
    domain: "." + BASE_DOMAIN,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: true,
  });

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
