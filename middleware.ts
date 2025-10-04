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

  const left = hostname.slice(0, -(BASE_DOMAIN.length + 1)); // before ".base"
  const labels = left.split(".");
  const sub = labels[labels.length - 1] || null;
  if (!sub) return null;
  if (sub === "www" || sub === "auth") return null; // reserved
  return sub;
}

export function middleware(req: NextRequest) {
  const host = stripPort(req.headers.get("host")) || "";
  const tenant = getSubdomain(host);

  // forward tenant as a header
  const headers = new Headers(req.headers);
  if (tenant) headers.set("x-tenant", tenant);

  const res = NextResponse.next({ request: { headers } });

  // also persist as a base-domain cookie so auth callbacks can read it
  const cookieTenant = tenant ?? (host === AUTH_HOST ? "auth" : "");
  res.cookies.set("tenant", cookieTenant, {
    domain: "." + BASE_DOMAIN,
    path: "/",
    httpOnly: false, // make it easy to read on client if needed
    sameSite: "lax",
    secure: true, // prod on Vercel is HTTPS
  });

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
