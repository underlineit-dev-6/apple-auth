"use client";

import { get } from "lodash";
import { useSession } from "next-auth/react";

function SocialLogin() {
  const { data: session } = useSession();
  return (
    <h1>
      Welcome {get(session, "user.email")} - {get(session, "provider")}
    </h1>
  );
}
export default SocialLogin;
