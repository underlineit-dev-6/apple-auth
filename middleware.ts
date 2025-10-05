// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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
  if (sub === "www" || sub === "auth") return null;
  return sub;
}

export async function middleware(req: NextRequest) {
  const host = stripPort(req.headers.get("host")) || "";
  const tenant = getSubdomain(host);

  // Forward tenant header
  const headers = new Headers(req.headers);
  if (tenant) headers.set("x-tenant", tenant);

  // Persist base-domain tenant cookie (auth | actual tenant | "")
  const cookieTenant = tenant ?? (host === AUTH_HOST ? "auth" : "");
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set("tenant", cookieTenant, {
    domain: "." + BASE_DOMAIN,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: true,
  });

  // 🔒 Treat each subdomain as a separate site:
  // If the session belongs to a different subdomain, redirect to this site's login
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenSub = (token as any)?.subdomain || (token as any)?.tenant;

    if (tenant && tokenSub && tenant !== tokenSub) {
      // Not the right brand for this session → force local login page
      const loginUrl = new URL("/", req.url);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // ignore if no token or error
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
