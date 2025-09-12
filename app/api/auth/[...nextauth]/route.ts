import NextAuth from "next-auth";
import AuthOptions from "../AuthOptions";

const handlers = NextAuth(AuthOptions);

export const { GET, POST } = handlers;
