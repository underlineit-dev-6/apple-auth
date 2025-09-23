"use client";
import { signIn, useSession } from "next-auth/react";
import { get } from "lodash";
import { FaApple } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtom } from "jotai";
import { appSessionState } from "@/appProvider";

export default function Home() {
  const { data: session } = useSession();
  const [appState, setAppState] = useAtom(appSessionState);
  const [login, setLogin] = useState(false);

  const navigate = useRouter();
  const onSocialLogin = async () => {
    setAppState({ ...appState, loading: true });
    try {
      const result: any = await signIn("apple", {
        redirect: false,
        callbackUrl: "/social-login",
      });
      console.log("Apple sign-in result:", result);
      if (get(result, "error")) {
      }
    } catch (error) {
      console.log(error);
    }
  };
  console.log(session, login, appState);
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white cursor-pointer"
        onClick={onSocialLogin}
      >
        <FaApple size={20} />
        Sign in with Apple
      </button>
    </div>
  );
}
