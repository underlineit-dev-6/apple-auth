import get from "lodash/get";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { getServerSession, type AuthOptions } from "next-auth";

import { assign } from "lodash";
import AppleProvider from "next-auth/providers/apple";
import jwt from "jsonwebtoken";

export function generateAppleClientSecret() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 15777000, // 6 months
    aud: "https://appleid.apple.com",
    sub: process.env.APPLE_ID,
  };

  return jwt.sign(
    payload,
    process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    {
      algorithm: "ES256",
      keyid: process.env.APPLE_KEY_ID,
    }
  );
}

const AuthOptions: AuthOptions = {
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    CredentialsProvider({
      name: "credentials" as string,
      credentials: {
        brandId: { label: "brandId", type: "text" },
        userData: { label: "userData", type: "object" },
        url: { label: "url", type: "text" },
        method: { label: "method", type: "text" },
        email: { label: "email", type: "text" },
        password: { label: "password", type: "text" },
        token: { label: "token", type: "text" },
        credential: { label: "credential", type: "text" },
      },
      async authorize(credentials, req) {
        let user: any;
        const res = JSON.parse(get(credentials, "userData", `{}`));
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        const token = get(res, "access_token", get(credentials, "token"));
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        return user;
      },
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: generateAppleClientSecret(),
      authorization: {
        params: {
          scope: "name email",
          response_type: "code",
          response_mode: "form_post",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    signIn: async ({ user, account, profile, provider }: any) => {
      if (
        (account?.provider === "google" || account?.provider === "apple") &&
        account?.id_token
      ) {
        user.idToken = account?.id_token;
      }
      return true;
    },
    jwt: async ({ token, user, trigger, session, provider }: any) => {
      if (user) {
        token.name = user?.name;
        token.mobile = user?.mobile;
        token.email = user?.email;
        token.role = user?.role;
        token.token = user?.token;
        token.theme = user?.theme;
        token._id = user?._id;
        token.profileColor = user?.profileColor;
        token.timeZone = user?.timeZone;
        token.profilePicture = user?.profilePicture;
        token.deviceId = user?.deviceId;
        token.recentBrandId = user?.recentBrandId;
        token.activeBrandsCount = user?.activeBrandsCount;
        token.canImpersonate = user?.canImpersonate;
        token.displayRoleName = user?.displayRoleName;
        token.brandId = user?.brandId;
        token.brand = user?.brand;
        token.subdomain = user?.subdomain;
        token.recentBoardId = user?.recentBoardId;
        token.recentWorkspaceId = user?.recentWorkspaceId;
        token.recentDashboardId = user?.recentDashboardId;
        token.idToken = user?.idToken;
        token.recentBrandId = user?.recentBrandId;
        if (user?.refreshToken) {
          token.refreshToken = user?.refreshToken;
        }
      }
      if (user?.idToken) {
        token.idToken = user.idToken;
      }
      if (trigger === "update" && session) {
        if (session?.role) {
          token.role = session?.role;
        }
        if (session?.name) {
          token.name = session?.name;
        }
        if (session?.email) {
          token.email = session?.email;
        }
        if (session?.displayRoleName) {
          token.displayRoleName = session?.displayRoleName;
        }
        if (session?.token) {
          token.token = session?.token;
        }
        if (session?._id) {
          token._id = session?._id;
        }
        if (session?.profileColor) {
          token.profileColor = session?.profileColor;
        }
        if (session?.timeZone) {
          token.timeZone = session?.timeZone;
        }
        if (session?.profilePicture || session?.profilePicture === null) {
          token.profilePicture = session?.profilePicture;
        }
        if (session?.deviceId !== undefined) {
          token.deviceId = session?.deviceId;
        }
        if (session?.brandId) {
          token.brandId = session?.brandId;
        }
        if (session?.brand) {
          token.brand = session?.brand;
        }
        if (session?.subdomain) {
          token.subdomain = session?.subdomain;
        }
        if (session?.recentWorkspaceId !== undefined) {
          token.recentWorkspaceId = session?.recentWorkspaceId;
        }
        if (session?.recentBoardId !== undefined) {
          token.recentBoardId = session?.recentBoardId;
        }
        if (session?.recentDashboardId !== undefined) {
          token.recentDashboardId = session?.recentDashboardId;
        }
        if (session?.refreshToken) {
          token.refreshToken = session?.refreshToken;
        }
        if (session?.recentBrandId !== undefined) {
          token.recentBrandId = session?.recentBrandId;
        }
        if (session?.canImpersonate !== undefined) {
          token.canImpersonate = session?.canImpersonate;
        }
        if (session?.activeBrandsCount) {
          token.activeBrandsCount = session?.activeBrandsCount;
        }
        if (session?.theme) {
          token.theme = session?.theme;
        }
        if (session?.mobile) {
          token.mobile = session?.mobile;
        }
      }
      return token;
    },
    session: async ({ session, token, trigger, newSession }: any) => {
      if (token) {
        session.user = {
          name: token?.name,
          email: token?.email,
          role: token?.role,
          displayRoleName: token?.displayRoleName,
          token: token?.token,
          _id: token?._id,
          profileColor: token?.profileColor,
          timeZone: token?.timeZone,
          profilePicture: token?.profilePicture,
          deviceId: token?.deviceId,
          brandId: token?.brandId,
          brand: token?.brand,
          subdomain: token?.subdomain,
          recentWorkspaceId: token?.recentWorkspaceId,
          recentBoardId: token?.recentBoardId,
          recentDashboardId: token?.recentDashboardId,
          idToken: token.idToken,
          recentBrandId: token?.recentBrandId,
          activeBrandsCount: token?.activeBrandsCount,
          canImpersonate: token?.canImpersonate,
          theme: token?.theme,
          mobile: token?.mobile,
        };
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET as string,
};
export const getServerAuthSession = () => getServerSession(AuthOptions);

export default AuthOptions;
