// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import { authOptions } from "../AuthOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
