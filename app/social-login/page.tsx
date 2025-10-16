"use client";

import { get } from "lodash";
import { signOut, useSession } from "next-auth/react";

function SocialLogin() {
  const { data: session } = useSession();
  return (
    <div className="flex flex-col justify-center items-center h-screen gap-3">
      <div>
        <h1>
          Welcome {get(session, "user.email")} -{" "}
          {get(session, "user.subdomain", "")}
        </h1>
      </div>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white cursor-pointer"
        onClick={async () =>
          await signOut({ callbackUrl: `${window.location.origin}/` })
        }
      >
        Logout
      </button>
    </div>
  );
}
export default SocialLogin;
