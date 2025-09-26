"use client";

import { signIn } from "next-auth/react";
import { useState, useCallback } from "react";
import { FaApple } from "react-icons/fa";
import { BsGoogle } from "react-icons/bs";

function getTenantFromHost(host?: string | null) {
  if (!host) return null;
  const [hostname] = host.split(":");
  const parts = (hostname || "").split(".").filter(Boolean);
  if (parts.length < 3) return null;
  const sub = parts[0]?.toLowerCase();
  if (!sub || ["www", "auth"].includes(sub)) return null;
  return sub;
}

export default function SignInPage() {
  const [loggingIn, setLoggingIn] = useState<null | "google" | "apple">(null);

  const onSocialLogin = useCallback(
    async (provider: "google" | "apple") => {
      if (loggingIn) return; // prevent duplicates
      setLoggingIn(provider);

      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const host = typeof window !== "undefined" ? window.location.host : "";
        const tenant = getTenantFromHost(host);
        const callbackUrl = origin ? `${origin}/social-login` : "/social-login";

        const res = await signIn(provider, {
          redirect: false,
          callbackUrl,
          // include tenant for multi-tenant routing on callback
          state: JSON.stringify({ tenant, callbackUrl }),
        });

        if (res?.error) {
          console.error(res.error);
          setLoggingIn(null);
          return;
        }
        if (res?.url) {
          window.location.href = res.url; // hand off to provider
          return;
        }
        // fallback
        window.location.assign(callbackUrl);
      } catch (e) {
        console.error(e);
        setLoggingIn(null);
      }
    },
    [loggingIn]
  );

  return (
    <div className="flex gap-3 items-center justify-center h-screen">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
        onClick={() => onSocialLogin("apple")}
        disabled={loggingIn !== null}
      >
        <FaApple size={20} />
        {loggingIn === "apple" ? "Signing in…" : "Sign in with Apple"}
      </button>

      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
        onClick={() => onSocialLogin("google")}
        disabled={loggingIn !== null}
      >
        <BsGoogle size={20} />
        {loggingIn === "google" ? "Signing in…" : "Sign in with Google"}
      </button>
    </div>
  );
}
