import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const AUTH_HOST = `auth.${BASE_DOMAIN}`;
const IS_PROD = process.env.NODE_ENV === "production";

const SESSION_COOKIE = IS_PROD
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";
const CALLBACK_COOKIE = IS_PROD
  ? "__Secure-next-auth.callback-url"
  : "next-auth.callback-url";
const TENANT_RETURN_COOKIE = "tenant-return";

/** Only allow HTTPS tenant URLs on *.BASE_DOMAIN, explicitly excluding the auth host. */
function allowedTenant(url: string) {
  try {
    const u = new URL(url);
    const isHttpsOk = IS_PROD
      ? u.protocol === "https:"
      : u.protocol === "https:" || u.protocol === "http:";
    const isTenantHost =
      u.hostname !== AUTH_HOST &&
      (u.hostname === BASE_DOMAIN || u.hostname.endsWith("." + BASE_DOMAIN));
    return isHttpsOk && isTenantHost;
  } catch {
    return false;
  }
}

export function authMiddleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Never touch NextAuth internals
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    const urlParamCb = req.nextUrl.searchParams.get("callbackUrl");
    const cookieCb = req.cookies.get(CALLBACK_COOKIE)?.value;
    const fb = req.cookies.get(TENANT_RETURN_COOKIE)?.value;

    const target = [urlParamCb, cookieCb, fb].find(
      (v) => v && allowedTenant(v!)
    );
    if (target) {
      const res = NextResponse.redirect(new URL(target!));
      res.cookies.delete(CALLBACK_COOKIE);
      res.cookies.delete(TENANT_RETURN_COOKIE);
      return res;
    }
    return NextResponse.next();
  }

  // (existing post-login bounce logic)
  const cb = req.cookies.get(CALLBACK_COOKIE)?.value;
  const fb = req.cookies.get(TENANT_RETURN_COOKIE)?.value;

  let target: string | null = null;
  if (cb && allowedTenant(cb)) target = cb;
  if (!target && fb && allowedTenant(fb)) target = fb;

  if (!target) return NextResponse.next();

  try {
    const t = new URL(target);
    if (t.toString() === req.nextUrl.toString() || t.hostname === AUTH_HOST) {
      return NextResponse.next();
    }
    const res = NextResponse.redirect(t);
    res.cookies.delete(CALLBACK_COOKIE);
    res.cookies.delete(TENANT_RETURN_COOKIE);
    return res;
  } catch {
    return NextResponse.next();
  }
}
