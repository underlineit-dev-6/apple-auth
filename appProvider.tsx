"use client";
import { atom } from "jotai";
import { SessionProvider } from "next-auth/react";

export const appSessionState = atom({});

export default function AppProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
