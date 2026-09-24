import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: googleClientId && googleClientSecret
    ? [Google({ clientId: googleClientId, clientSecret: googleClientSecret })]
    : [],
  pages: {
    signIn: "/sign-in",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const isProtectedPage = pathname.startsWith("/app") || pathname.startsWith("/leader");

      if (!isProtectedPage) return true;
      if (auth?.user) return true;

      const signInUrl = new URL("/sign-in", request.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
      return Response.redirect(signInUrl);
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
