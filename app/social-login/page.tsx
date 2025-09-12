"use client";

import { get } from "lodash";
import { useSession } from "next-auth/react";

function SocialLogin() {
  const { data: session } = useSession();
  return <h1>{get(session, "user.name")}</h1>;
}
export default SocialLogin;
