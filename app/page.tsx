"use client";
import { signIn, useSession } from "next-auth/react";
import { get } from "lodash";
import { FaApple } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtom } from "jotai";
import { appSessionState } from "@/appProvider";
import { BsGoogle } from "react-icons/bs";

export default function Home() {
  const { data: session } = useSession();
  const [appState, setAppState] = useAtom(appSessionState);
  const [login, setLogin] = useState(false);

  const navigate = useRouter();
  const onSocialLogin = async (provider: "apple" | "google") => {
    const res = await signIn(provider, {
      redirect: false,
      callbackUrl: "/social-login",
    });

    if (res?.error) {
      console.error(res.error);
      return;
    }
    if (res?.url) {
      // Go to Apple. After a successful callback, the redirect() above sends you to /social-login
      window.location.href = res.url;
    }
  };

  return (
    <div className="flex gap-2 items-center justify-center h-screen">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white cursor-pointer"
        onClick={() => onSocialLogin("apple")}
      >
        <FaApple size={20} />
        Sign in with Apple
      </button>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white cursor-pointer"
        onClick={() => onSocialLogin("google")}
      >
        <BsGoogle size={20} />
        Sign in with Google
      </button>
    </div>
  );
}
