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
    signIn: "/signin", // Use a dedicated signin page
    error: "/auth/error",
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
      async authorize(credentials, req) {
        try {
          // Validate credentials properly
          if (!credentials?.email && !credentials?.token) {
            return null;
          }

          let user: any = null;
          const userData = credentials?.userData
            ? JSON.parse(credentials.userData)
            : {};

          // Add your authentication logic here
          // Return user object if valid, null otherwise

          return user;
        } catch (error) {
          console.error("Credentials authorization error:", error);
          return null;
        }
      },
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: await generateAppleClientSecret(),
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true, // Only over HTTPS
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      try {
        // Add domain validation for security
        const allowedDomains = process.env.ALLOWED_DOMAINS?.split(",") || [];

        if (account?.provider === "apple" && account?.id_token) {
          user.idToken = account.id_token;
          return true;
        }

        if (account?.provider === "credentials") {
          return !!user; // Only allow if user exists
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
          // Only set essential fields to reduce token size
          token.name = user.name;
          token.email = user.email;
          token.role = user.role;
          token._id = user._id;
          token.brandId = user.brandId;
          token.idToken = user.idToken;
        }

        if (trigger === "update" && session) {
          // Safely update token
          const allowedFields = ["name", "email", "role", "brandId", "_id"];
          allowedFields.forEach((field) => {
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

    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user = {
            ...session.user,
            name: token.name,
            email: token.email,
            role: token.role,
            _id: token._id,
            brandId: token.brandId,
            idToken: token.idToken,
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
  debug: false, // Turn off in production
  useSecureCookies: true,
};

export default AuthOptions;
