"use client";
import { signIn } from "next-auth/react";
import { FaApple } from "react-icons/fa";

export default function Home() {
  const onSocialLogin = async () => {
    const callbackUrl = "/social-login"; // keep it relative (same origin)

    // Try the JS helper first
    const res = await signIn("apple", { redirect: false, callbackUrl });

    // If NextAuth reports an error, surface it
    if (res?.error) {
      console.error("[Apple sign-in] error:", res.error);
      return;
    }

    // Preferred: NextAuth gave us the provider URL
    if (res?.url) {
      window.location.href = res.url;
      return;
    }

    // Fallback: hit NextAuth’s signin endpoint directly (always works)
    const fallback = `/api/auth/signin/apple?callbackUrl=${encodeURIComponent(
      callbackUrl
    )}`;
    window.location.href = fallback;
  };

  return (
    <div className="min-h-screen grid place-items-center p-8">
      <button
        onClick={onSocialLogin}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white"
      >
        <FaApple size={20} /> Sign in with Apple
      </button>
    </div>
  );
}
