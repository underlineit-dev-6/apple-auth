import get from "lodash/get";
import CredentialsProvider from "next-auth/providers/credentials";
import AppleProvider from "next-auth/providers/apple";
import * as jose from "jose";

export async function generateAppleClientSecret() {
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_ID!; // or APPLE_CLIENT_ID
  const keyId = process.env.APPLE_KEY_ID!;

  const now = Math.floor(Date.now() / 1000);
  const alg = "ES256";

  try {
    const token = await new jose.SignJWT({})
      .setProtectedHeader({ alg, kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .setExpirationTime(now + 15777000) // 6 months
      .setAudience("https://appleid.apple.com")
      .setSubject(clientId)
      .sign(await jose.importPKCS8(privateKey, alg));

    return token;
  } catch (error) {
    console.error("Error generating Apple client secret:", error);
    throw error;
  }
}

// Create a function to get the client secret dynamically
async function getAppleClientSecret() {
  return await generateAppleClientSecret();
}

const AuthOptions: any = {
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    CredentialsProvider({
      name: "credentials" as string,
      credentials: {
        brandId: { label: "brandId", type: "text" },
        userData: { label: "userData", type: "text" }, // Fixed: should be text, not object
        url: { label: "url", type: "text" },
        method: { label: "method", type: "text" },
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
        token: { label: "token", type: "text" },
        credential: { label: "credential", type: "text" },
      },
      async authorize(credentials, req) {
        try {
          let user: any = null;

          if (!credentials) {
            return null;
          }

          const userData = credentials.userData
            ? JSON.parse(credentials.userData)
            : {};
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };

          const token = get(userData, "access_token", credentials.token);
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          // Add your actual authentication logic here
          // For now, returning null - replace with your auth logic

          return user;
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!, // Generate fresh secret
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
    strategy: "jwt" as const,
  },
  callbacks: {
    signIn: async ({ user, account, profile }: any) => {
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

    jwt: async ({ token, user, trigger, session }: any) => {
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
          // Simplified update logic
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
          ];

          updateableFields.forEach((field) => {
            if (session[field] !== undefined) {
              token[field] = session[field];
            }
          });
        }

        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },

    session: async ({ session, token }: any) => {
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
          };
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET as string,
};

export default AuthOptions;
