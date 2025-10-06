"use client";

import { useCallback, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { FaApple } from "react-icons/fa";
import { BsGoogle } from "react-icons/bs";

type Provider = "apple" | "google";
const AUTH_ORIGIN = "https://auth.urstruly.xyz"; // set on TENANTS only

const TENANT_POST_LOGIN_PATH = "/social-login";

export default function Home() {
  const [loading, setLoading] = useState<Provider | null>(null);

  const { origin, host } = useMemo(() => {
    return { origin: window.location.origin, host: window.location.host };
  }, []);

  const tenantCallbackUrl = useMemo(
    () => new URL(TENANT_POST_LOGIN_PATH, origin).toString(),
    [origin]
  );

  const onSocialLogin = useCallback(
    async (provider: Provider) => {
      try {
        setLoading(provider);

        // If we are on a tenant host and have AUTH_ORIGIN, jump to central auth
        const onAuthHost = host === "auth.urstruly.xyz";
        if (!onAuthHost && AUTH_ORIGIN) {
          window.location.href = `${AUTH_ORIGIN}/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(
            tenantCallbackUrl
          )}`;
          return;
        }

        // Otherwise (we’re already on auth host, or we rely on tenant rewrite)
        const res = await signIn(provider, {
          redirect: false,
          callbackUrl: tenantCallbackUrl,
        });
        if (res?.error) {
          console.error("OAuth start error:", res.error);
          return;
        }
        if (res?.url) window.location.href = res.url;
      } finally {
        setLoading(null);
      }
    },
    [tenantCallbackUrl, host]
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
