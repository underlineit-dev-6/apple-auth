"use client";
import { signIn, useSession } from "next-auth/react";
import { get } from "lodash";
import { FaApple } from "react-icons/fa";

export default function Home() {
  const { data: session } = useSession();
  const onSocialLogin = async () => {
    try {
      const result: any = await signIn("apple", {
        redirect: true,
      });
      if (get(result, "error")) {
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white"
        onClick={onSocialLogin}
      >
        <FaApple size={20} />
        Sign in with Apple
      </button>
    </div>
  );
}
