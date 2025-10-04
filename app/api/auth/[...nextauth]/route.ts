import NextAuth from "next-auth";
import { authOptions } from "../AuthOptions";

export const runtime = "nodejs";

console.warn("NEXTAUTH_URL (module init):", process.env.NEXTAUTH_URL);

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
