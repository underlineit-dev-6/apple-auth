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
          {get(session, "user.provider", "")}
        </h1>
      </div>
      <button onClick={async () => await signOut()}>Logout</button>
    </div>
  );
}
export default SocialLogin;
