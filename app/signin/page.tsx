"use client";
import { getSession, signIn, useSession } from "next-auth/react";
import { get, set } from "lodash";
import { FaApple } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const navigate = useRouter();
  const [login, setLogin] = useState(false);

  const onSocialLogin = async () => {
    setLogin(true);
    try {
      const result: any = await signIn("apple", { redirect: true });
      const session = await getSession();
      console.log("Session after sign-in:", session);
      console.log("Apple sign-in result:", result);
      if (get(result, "error")) {
      }
    } catch (error) {
      console.log(error);
    }
  };
  console.log(login, session, "login session");
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <a
        href={`/api/auth/signin/apple?callbackUrl=${encodeURIComponent(
          "/social-login"
        )}`}
      >
        Sign in with Apple
      </a>
    </div>
  );
}
