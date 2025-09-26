// middleware.ts (runs on acme.example.com, beta.example.com, etc.)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getSubdomain(host?: string | null) {
  if (!host) return null;
  const parts = host.split(".");
  if (parts.length < 3) return null;
  const sub = parts[0];
  return ["www", "auth"].includes(sub) ? null : sub;
}

export function middleware(req: NextRequest) {
  const sub = getSubdomain(req.headers.get("host"));
  if (sub) req.headers.set("x-tenant", sub);
  return NextResponse.next({ request: { headers: req.headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
