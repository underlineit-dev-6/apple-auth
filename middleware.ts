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
  return sub === "www" || sub === "auth" ? null : sub;
}

export async function middleware(req: NextRequest) {
  const hostHeader = req.headers.get("host") || "";
  const host = stripPort(hostHeader) || "";
  const { pathname, protocol } = req.nextUrl;

  // 1) 🔁 Force ALL NextAuth traffic to auth.<domain>
  const isNextAuthRoute =
    pathname === "/api/auth" || pathname.startsWith("/api/auth/");
  if (host !== AUTH_HOST && isNextAuthRoute) {
    const redirectURL = new URL(req.url);
    redirectURL.hostname = AUTH_HOST;
    redirectURL.protocol = protocol; // http locally, https on Vercel
    if (redirectURL.protocol === "https:") redirectURL.port = "";
    return NextResponse.redirect(redirectURL, { status: 307 }); // preserve method/body
  }

  // 2) ➡️ Forward tenant as header + persist cookie on base domain
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

  // 3) 🔒 Separate site behavior:
  //    If JWT says user belongs to a different subdomain, treat this site as separate → redirect to its own login
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenSub = (token as any)?.subdomain || (token as any)?.tenant;

    if (
      tenant && // we are on a tenant host
      tokenSub && // token has a subdomain
      tenant !== tokenSub && // mismatch with current tenant
      !isNextAuthRoute && // don't loop on auth endpoints
      pathname !== "/" // if already on login page, let it render
    ) {
      const to = new URL("/", req.url); // this tenant's login
      return NextResponse.redirect(to, { status: 302 });
    }
  } catch {
    // ignore if no token / parse error
  }

  return res;
}

export const config = {
  // Skip Next static assets; allow everything else (incl. /.well-known for Apple domain verification)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
