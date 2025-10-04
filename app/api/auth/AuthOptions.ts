// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";
import get from "lodash/get";
import { cookies } from "next/headers";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "urstruly.xyz";
const IS_PROD = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/", // login lives on auth.* root
    error: "/",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        brandId: { label: "brandId", type: "text" },
        userData: { label: "userData", type: "text" },
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
          if (bearer) (headers as any).Authorization = `Bearer ${bearer}`;

          // TODO: Call your tenant-aware API and return a user object (include .subdomain)
          // Example user object MUST include: { subdomain: "brand1", email: ... }
          return null;
        } catch (e) {
          console.error("Authorization error:", e);
          return null;
        }
      },
    }),

    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "name email",
          response_type: "code",
          response_mode: "form_post",
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
    // Cross-subdomain session so auth.* can log you in and tenant.* can read it.
    sessionToken: {
      name: IS_PROD
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        path: "/",
        domain: "." + BASE_DOMAIN,
      },
    },
    pkceCodeVerifier: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.pkce.code_verifier"
          : "next-auth.pkce.code_verifier",
      options: { httpOnly: true, sameSite: "none", secure: true, path: "/" },
    },
    state: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.state"
          : "next-auth.state",
      options: { httpOnly: true, sameSite: "none", secure: true, path: "/" },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.callback-url"
          : "next-auth.callback-url",
      options: { httpOnly: true, sameSite: "none", secure: true, path: "/" },
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
    async signIn({ user, account }) {
      try {
        if (
          (account?.provider === "google" || account?.provider === "apple") &&
          account?.id_token
        ) {
          (user as any).idToken = account.id_token;
          (user as any).provider = account.provider;
        }

        // ✅ If your user object contains subdomain, redirect directly there
        const sub = (user as any)?.subdomain;
        if (sub) {
          // Send the user straight to their site after the OAuth handshake
          return `https://${sub}.${BASE_DOMAIN}/social-login`;
        }

        // Otherwise continue and let redirect() fallback use the tenant cookie
        return true;
      } catch (e) {
        console.error("SignIn callback error:", e);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
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
          const fields = [
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
          for (const f of fields)
            if ((session as any)[f] !== undefined)
              (token as any)[f] = (session as any)[f];
        }

        // Optionally copy `tenant` cookie in too
        const store = await cookies();
        const tenant = store.get("tenant")?.value;
        if (tenant && tenant !== "auth") {
          (token as any).tenant = tenant;
          (token as any).subdomain = (token as any).subdomain || tenant;
        }

        return token;
      } catch (e) {
        console.error("JWT callback error:", e);
        return token;
      }
    },

    async session({ session, token }) {
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
          tenant: (token as any)?.tenant,
        };
        return session;
      } catch (e) {
        console.error("Session callback error:", e);
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
