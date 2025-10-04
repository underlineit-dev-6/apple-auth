"use client";

import { get } from "lodash";
import { signOut, useSession } from "next-auth/react";

export default function SocialLogin() {
  const { data: session } = useSession();

  const onLogout = async () => {
    const callbackUrl = new URL("/", window.location.href).toString(); // stay on the tenant
    await signOut({ callbackUrl });
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen gap-3">
      <h1>
        Welcome {get(session, "user.email", "User")} —{" "}
        {get(session, "user.provider", "")}
      </h1>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white"
        onClick={onLogout}
      >
        Logout
      </button>
    </div>
  );
}
