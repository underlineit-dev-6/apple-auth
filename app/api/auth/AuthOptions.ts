// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AppleProvider from "next-auth/providers/apple";
import GoogleProvider from "next-auth/providers/google";

const isProd = process.env.NODE_ENV === "production";
const APP_DOMAIN = process.env.APP_DOMAIN; // e.g. "yourdomain.com" (no scheme)

// ---- helpers ----
function tenantFromHost(host?: string | null) {
  if (!host) return null;
  const hostname = host.split(":")[0] || "";
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length < 3) return null;
  const sub = parts[0]?.toLowerCase();
  if (!sub || ["www", "auth"].includes(sub)) return null;
  return sub;
}
function tenantFromCallbackUrl(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return tenantFromHost(u.hostname);
  } catch {
    return null;
  }
}
function parentDomainCookieOptions() {
  // Share session across subdomains in production
  return isProd && APP_DOMAIN
    ? {
        domain: `.${APP_DOMAIN}`,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      }
    : { path: "/", httpOnly: true, sameSite: "lax", secure: false };
}

export const authOptions: NextAuthOptions = {
  // important behind proxies and for host parsing
  // @ts-expect-error - present at runtime
  trustHost: true,

  pages: { signIn: "/", error: "/" },

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
      async authorize(credentials, req) {
        try {
          if (!credentials) return null;

          const userData = credentials.userData
            ? JSON.parse(credentials.userData)
            : {};
          const headers: HeadersInit = { "Content-Type": "application/json" };
          const bearer = (userData as any)?.access_token || credentials.token;
          if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

          // Optional: forward tenant from host to your API
          const reqHost = (req?.headers as any)?.host as string | undefined;
          const tenant = tenantFromHost(reqHost);
          if (tenant) (headers as any)["x-tenant"] = tenant;

          // TODO: call your API and return a user object on success
          // const res = await fetch(credentials.url!, { method: credentials.method || "POST", headers, body: JSON.stringify({...}) });
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
      clientSecret: process.env.APPLE_CLIENT_SECRET!, // signed JWT string
      authorization: {
        params: {
          scope: "name email",
          response_type: "code",
          response_mode: "form_post",
        },
      },
      checks: ["pkce", "state"],
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["pkce", "state"],
    }),
  ],

  session: { strategy: "jwt" },

  // --- cookie fixes: dev vs prod ---
  cookies: {
    // share session across subdomains in prod if APP_DOMAIN is set
    sessionToken: {
      name: isProd
        ? "__Host-next-auth.session-token"
        : "next-auth.session-token",
      options: parentDomainCookieOptions(),
    },
    // ensure state/pkce cookies work on localhost (no Secure/None there)
    pkceCodeVerifier: {
      name: isProd
        ? "__Secure-next-auth.pkce.code_verifier"
        : "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        path: "/",
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
      },
    },
    state: {
      name: isProd ? "__Secure-next-auth.state" : "next-auth.state",
      options: {
        httpOnly: true,
        path: "/",
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
      },
    },
    callbackUrl: {
      name: isProd
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        httpOnly: true,
        path: "/",
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
      },
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

        // prefer tenant from state; else infer from callbackUrl
        const stateTenant =
          typeof (account as any)?.state === "string"
            ? (() => {
                try {
                  const s = JSON.parse((account as any).state);
                  return s?.tenant ?? null;
                } catch {
                  return null;
                }
              })()
            : null;

        const cbTenant = tenantFromCallbackUrl((account as any)?.callbackUrl);
        const derivedTenant = stateTenant || cbTenant || null;
        if (derivedTenant) (user as any).subdomain = derivedTenant;

        // TODO: verify user belongs to tenant here if needed
        return true;
      } catch (e) {
        console.error("signIn callback error:", e);
        return false;
      }
    },

    async jwt({ token, user, trigger, session, account }) {
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

        if (!user && account) {
          const stateTenant =
            typeof (account as any)?.state === "string"
              ? (() => {
                  try {
                    const s = JSON.parse((account as any).state);
                    return s?.tenant ?? null;
                  } catch {
                    return null;
                  }
                })()
              : null;
          const cbTenant = tenantFromCallbackUrl((account as any)?.callbackUrl);
          const derivedTenant = stateTenant || cbTenant || null;
          if (derivedTenant) (token as any).subdomain = derivedTenant;
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
          for (const f of fields) {
            if ((session as any)[f] !== undefined)
              (token as any)[f] = (session as any)[f];
          }
        }

        return token;
      } catch (e) {
        console.error("jwt callback error:", e);
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
        };
        return session;
      } catch (e) {
        console.error("session callback error:", e);
        return session;
      }
    },

    async redirect({ url, baseUrl }) {
      try {
        const base = new URL(baseUrl);
        const target = new URL(url, baseUrl);

        const sameOrigin = target.origin === base.origin;
        const allowedTenant =
          APP_DOMAIN && target.hostname.endsWith(`.${APP_DOMAIN}`);

        if (sameOrigin || allowedTenant) return target.toString();
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
