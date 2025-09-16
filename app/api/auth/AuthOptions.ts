import get from "lodash/get";
import CredentialsProvider from "next-auth/providers/credentials";
import AppleProvider from "next-auth/providers/apple";
import { NextAuthOptions } from "next-auth";
import * as jose from "jose";

export async function generateAppleClientSecret() {
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;

  const alg = "ES256";

  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg, kid: keyId })
    .setIssuer(teamId)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .setExpirationTime("180d")
    .sign(await jose.importPKCS8(privateKey, alg));

  return token;
}

const AuthOptions: NextAuthOptions = {
  pages: {
    signIn: "/",
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
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
        token: { label: "token", type: "text" },
        credential: { label: "credential", type: "text" },
      },
      async authorize(credentials, req) {
        try {
          let user: any;
          const res = JSON.parse(get(credentials, "userData", `{}`) as string);
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };

          const token = get(res, "access_token", get(credentials, "token"));
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          // Add your actual authentication logic here
          // This should return a user object or null

          return user;
        } catch (error) {
          console.error("Credentials authorization error:", error);
          return null;
        }
      },
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!, // Fixed: was APPLE_ID
      clientSecret: await generateAppleClientSecret(), // Generate fresh secret
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
    async signIn({ user, account, profile }: any) {
      try {
        if (
          (account?.provider === "google" || account?.provider === "apple") &&
          account?.id_token
        ) {
          user.idToken = account.id_token;
        }
        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }: any) {
      try {
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

          if (user?.refreshToken) {
            token.refreshToken = user.refreshToken;
          }
        }

        if (trigger === "update" && session) {
          // Update token with session data
          Object.keys(session).forEach((key) => {
            if (session[key] !== undefined) {
              token[key] = session[key];
            }
          });
        }

        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
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
          } as any;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export default AuthOptions;
