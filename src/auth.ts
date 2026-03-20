import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";
import { env } from "~/env";
import {
  extractGitHubUsername,
  isAllowedAdminUsername,
} from "~/server/admin/access";

const authConfig = {
  trustHost: true,
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      if (!request.nextUrl.pathname.startsWith("/admin")) {
        return true;
      }

      return Boolean(auth?.user?.isAdmin);
    },
    signIn({ profile }) {
      return isAllowedAdminUsername(extractGitHubUsername(profile));
    },
    jwt({ token, profile }) {
      const username =
        extractGitHubUsername(profile) ??
        (typeof token.username === "string" ? token.username : undefined);
      token.username = username;
      token.isAdmin = isAllowedAdminUsername(username);
      return token;
    },
    session({ session, token }) {
      session.user.isAdmin = Boolean(token.isAdmin);
      session.user.username =
        typeof token.username === "string" ? token.username : undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
