import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AppleProvider from "next-auth/providers/apple";
import get from "lodash/get";
import { getSession } from "next-auth/react";
import GoogleProvider from "next-auth/providers/google";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const IS_PROD = process.env.NODE_ENV === "production";
export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/",
    error: "/",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        brandId: { label: "brandId", type: "text" },
        userData: { label: "userData", type: "text" }, // text, not object
        url: { label: "url", type: "text" },
        method: { label: "method", type: "text" },
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
        token: { label: "token", type: "text" },
        credential: { label: "credential", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials) return null;

          const userData = credentials.userData
            ? JSON.parse(credentials.userData)
            : {};
          const headers: HeadersInit = { "Content-Type": "application/json" };

          const bearer = get(userData, "access_token", credentials.token);
          if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

          // TODO: Call your API and return a user object on success
          // const res = await fetch(credentials.url!, { method: credentials.method || "POST", headers, body: JSON.stringify(...) });
          // if (!res.ok) return null;
          // const user = await res.json();
          // return user ?? null;

          return null;
        } catch (err) {
          console.error("Authorization error:", err);
          return null;
        }
      },
    }),

    AppleProvider({
      clientId: process.env.APPLE_ID!, // Services ID
      clientSecret: process.env.APPLE_CLIENT_SECRET!, // <-- STRING JWT from your generator
      authorization: {
        params: {
          scope: "name email",
          response_type: "code",
          response_mode: "form_post", // Apple posts back
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: "jwt" },

  cookies: {
    pkceCodeVerifier: IS_PROD
      ? {
          name: "__Secure-next-auth.pkce.code_verifier",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            domain: "." + BASE_DOMAIN,
          },
        }
      : {
          name: "next-auth.pkce.code_verifier",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            path: "/",
          },
        },
    state: IS_PROD
      ? {
          name: "__Secure-next-auth.state",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            domain: "." + BASE_DOMAIN,
          },
        }
      : {
          name: "next-auth.state",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            path: "/",
          },
        },
    callbackUrl: IS_PROD
      ? {
          name: "__Secure-next-auth.callback-url",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            domain: "." + BASE_DOMAIN,
          },
        }
      : {
          name: "next-auth.callback-url",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            path: "/",
          },
        },
    sessionToken: IS_PROD
      ? {
          name: "__Secure-next-auth.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            domain: "." + BASE_DOMAIN,
          },
        }
      : {
          name: "next-auth.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            path: "/",
          },
        },
  },
  logger: {
    error(code, metadata) {
      console.error("NextAuth error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth warn:", code);
    },
    debug(code, metadata) {
      console.log("NextAuth debug:", code, metadata);
    },
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);
        // allow any https subdomain of the base domain
        if (
          target.protocol === "https:" &&
          (target.hostname === BASE_DOMAIN ||
            target.hostname.endsWith("." + BASE_DOMAIN))
        ) {
          return target.toString();
        }
        // fallback to home on auth domain
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
    async signIn({ user, account }) {
      console.warn(user, account);
      try {
        if (
          (account?.provider === "google" || account?.provider === "apple") &&
          account?.id_token
        ) {
          (user as any).idToken = account.id_token;
          (user as any).provider = account.provider;
        }
        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session, account }) {
      console.warn(token, user, trigger, session, account);
      try {
        if (user) {
          Object.assign(token, {
            name: (user as any)?.name,
            mobile: (user as any)?.mobile,
            email: (user as any)?.email,
            role: (user as any)?.role,
            token: (user as any)?.token,
            theme: (user as any)?.theme,
            _id: (user as any)?._id,
            profileColor: (user as any)?.profileColor,
            timeZone: (user as any)?.timeZone,
            profilePicture: (user as any)?.profilePicture,
            deviceId: (user as any)?.deviceId,
            recentBrandId: (user as any)?.recentBrandId,
            activeBrandsCount: (user as any)?.activeBrandsCount,
            canImpersonate: (user as any)?.canImpersonate,
            displayRoleName: (user as any)?.displayRoleName,
            brandId: (user as any)?.brandId,
            brand: (user as any)?.brand,
            subdomain: (user as any)?.subdomain,
            recentBoardId: (user as any)?.recentBoardId,
            recentWorkspaceId: (user as any)?.recentWorkspaceId,
            recentDashboardId: (user as any)?.recentDashboardId,
            idToken: (user as any)?.idToken,
            refreshToken: (user as any)?.refreshToken,
            provider: (user as any)?.provider,
          });
        }

        if (trigger === "update" && session) {
          const updateableFields = [
            "role",
            "name",
            "email",
            "displayRoleName",
            "token",
            "_id",
            "profileColor",
            "timeZone",
            "profilePicture",
            "deviceId",
            "brandId",
            "brand",
            "subdomain",
            "recentWorkspaceId",
            "recentBoardId",
            "recentDashboardId",
            "refreshToken",
            "recentBrandId",
            "canImpersonate",
            "activeBrandsCount",
            "theme",
            "mobile",
            "provider",
          ] as const;

          for (const field of updateableFields) {
            if ((session as any)[field] !== undefined) {
              (token as any)[field] = (session as any)[field];
            }
          }
        }

        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },

    async session({ session, token }) {
      console.warn(session, token);
      try {
        (session as any).user = {
          name: token?.name,
          email: token?.email,
          role: (token as any)?.role,
          displayRoleName: (token as any)?.displayRoleName,
          token: (token as any)?.token,
          _id: (token as any)?._id,
          profileColor: (token as any)?.profileColor,
          timeZone: (token as any)?.timeZone,
          profilePicture: (token as any)?.profilePicture,
          deviceId: (token as any)?.deviceId,
          brandId: (token as any)?.brandId,
          brand: (token as any)?.brand,
          subdomain: (token as any)?.subdomain,
          recentWorkspaceId: (token as any)?.recentWorkspaceId,
          recentBoardId: (token as any)?.recentBoardId,
          recentDashboardId: (token as any)?.recentDashboardId,
          idToken: (token as any)?.idToken,
          recentBrandId: (token as any)?.recentBrandId,
          activeBrandsCount: (token as any)?.activeBrandsCount,
          canImpersonate: (token as any)?.canImpersonate,
          theme: (token as any)?.theme,
          mobile: (token as any)?.mobile,
          provider: (token as any)?.provider,
        };
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
