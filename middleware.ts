import type { NextRequest } from "next/server";
import { tenantMiddleware } from "./middleware/tenant";
import { authMiddleware } from "./middleware/auth";

const AUTH_HOST = `auth.${process.env.BASE_DOMAIN || "urstruly.xyz"}`;

export function middleware(req: NextRequest) {
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  )
    .replace(/:\d+$/, "")
    .toLowerCase();

  if (host === AUTH_HOST) return authMiddleware(req);
  return tenantMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets).*)",
  ],
};
