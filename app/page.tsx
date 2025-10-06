"use client";

import { useCallback, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { FaApple } from "react-icons/fa";
import { BsGoogle } from "react-icons/bs";

type Provider = "apple" | "google";

/**
 * If you have a separate auth deployment, set:
 * NEXT_PUBLIC_AUTH_ORIGIN=https://auth.urstruly.xyz
 *
 * If you also added a Next.js rewrite on tenants:
 *   source: "/api/auth/:path*"
 *   destination: "https://auth.urstruly.xyz/api/auth/:path*"
 * then `signIn()` can be used directly (rewrite will proxy).
 */
const AUTH_ORIGIN =  "https://auth.urstruly.xyz"

/** Change this to the path on the tenant you want to land on after login */
const TENANT_POST_LOGIN_PATH = "/social-login";

export default function Home() {
  const [loading, setLoading] = useState<Provider | null>(null);

  // Absolute callback URL on the CURRENT tenant (brand1, brand2, etc.)
  const tenantCallbackUrl = useMemo(() => {
    // window is always defined in client components
    const origin = window.location.origin; // "https://brand1.urstruly.xyz"
    const url = new URL(TENANT_POST_LOGIN_PATH, origin);
    return url.toString();
  }, []);

  const onSocialLogin = useCallback(
    async (provider: Provider) => {
      try {
        setLoading(provider);

        // If you DON'T have a rewrite on the tenant, hard-redirect the browser
        // to the central auth host so the NextAuth handler runs there.
        if (AUTH_ORIGIN) {
          const target = `${AUTH_ORIGIN}/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(
            tenantCallbackUrl
          )}`;
          window.location.href = target;
          return; // stop here; navigation in progress
        }

        // If you DO have a rewrite set up, we can call signIn() locally.
        // Use redirect: false to get back the provider URL; then navigate.
        const res = await signIn(provider, {
          redirect: false,
          callbackUrl: tenantCallbackUrl,
        });

        if (res?.error) {
          console.error("OAuth start error:", res.error);
          return;
        }
        if (res?.url) {
          window.location.href = res.url;
        }
      } catch (err) {
        console.error("Sign-in error:", err);
      } finally {
        setLoading(null);
      }
    },
    [tenantCallbackUrl]
  );

  return (
    <div className="flex gap-3 items-center justify-center h-screen">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
        onClick={() => onSocialLogin("apple")}
        disabled={loading !== null}
      >
        <FaApple size={20} />
        {loading === "apple" ? "Signing in…" : "Sign in with Apple"}
      </button>

      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
        onClick={() => onSocialLogin("google")}
        disabled={loading !== null}
      >
        <BsGoogle size={20} />
        {loading === "google" ? "Signing in…" : "Sign in with Google"}
      </button>
    </div>
  );
}
