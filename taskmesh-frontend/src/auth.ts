import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const authSecret = process.env.AUTH_SECRET;

if (process.env.NODE_ENV === "production" && (!googleClientId || !googleClientSecret || !authSecret)) {
  throw new Error(
    "Missing Google OAuth environment variables. Set AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, and AUTH_SECRET using real values from Google Cloud Console.",
  );
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      googleId?: string | null;
    };
  }

  interface User {
    id: string;
    googleId?: string | null;
  }
}

const databaseAuthConfig = {
  ...authConfig,
  secret: authSecret,
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      const googleId = account?.providerAccountId ?? user.id ?? user.email;

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          googleId,
          name: user.name ?? user.email,
          avatarUrl: user.image ?? null,
        },
        create: {
          email: user.email,
          googleId,
          name: user.name ?? user.email,
          avatarUrl: user.image ?? null,
          timezone: "UTC",
          role: "PARTICIPANT",
        },
      });

      return true;
    },

    async jwt({ token, user, account }) {
      const jwtToken = token as typeof token & {
        userId?: string;
        googleId?: string | null;
      };

      if (user?.email) {
        const dbUser =
          (await prisma.user.findUnique({ where: { email: user.email } })) ??
          (await prisma.user.findUnique({
            where: { googleId: account?.providerAccountId ?? user.id ?? user.email },
          }));

        if (dbUser) {
          jwtToken.userId = dbUser.id;
          jwtToken.googleId = dbUser.googleId ?? account?.providerAccountId ?? user.id ?? null;
        }
      }

      if (account?.providerAccountId) {
        jwtToken.googleId = account.providerAccountId;
      }

      return jwtToken;
    },

    async session({ session, token }) {
      const jwtToken = token as typeof token & {
        userId?: string;
        googleId?: string | null;
      };

      if (session.user) {
        session.user.id = jwtToken.userId ?? session.user.email ?? "";
        session.user.googleId = jwtToken.googleId ?? null;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(databaseAuthConfig);
