import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const IS_PROD = process.env.NODE_ENV === "production";

const SESSION_COOKIE = IS_PROD
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";
const CALLBACK_COOKIE = IS_PROD
  ? "__Secure-next-auth.callback-url"
  : "next-auth.callback-url";
const TENANT_RETURN_COOKIE = "tenant-return";

function allowed(url: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname === BASE_DOMAIN || u.hostname.endsWith("." + BASE_DOMAIN))
    );
  } catch {
    return false;
  }
}

export function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never touch NextAuth internals
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  // If already signed in on auth host, bounce to tenant callback
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) {
    const cb = req.cookies.get(CALLBACK_COOKIE)?.value;
    if (cb && allowed(cb)) return NextResponse.redirect(cb);

    const fb = req.cookies.get(TENANT_RETURN_COOKIE)?.value;
    if (fb && allowed(fb)) return NextResponse.redirect(fb);
  }

  return NextResponse.next();
}
