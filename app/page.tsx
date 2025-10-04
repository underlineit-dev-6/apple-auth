"use client";

import { signIn } from "next-auth/react";
import { FaApple } from "react-icons/fa";
import { BsGoogle } from "react-icons/bs";

export default function Home() {
  const onSocialLogin = async (provider: "apple" | "google") => {
    // Let NextAuth redirect; our redirect() callback will send to /social-login on the tenant subdomain
    await signIn(provider); // default redirect=true
  };

  return (
    <div className="flex gap-2 items-center justify-center h-screen">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white"
        onClick={() => onSocialLogin("apple")}
      >
        <FaApple size={20} /> Sign in with Apple
      </button>

      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white"
        onClick={() => onSocialLogin("google")}
      >
        <BsGoogle size={20} /> Sign in with Google
      </button>
    </div>
  );
}
