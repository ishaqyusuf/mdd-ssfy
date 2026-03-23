import { db, Roles, Users } from "@gnd/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { ICan, loginAction } from "./utils";

declare module "next-auth" {
  interface User {
    user: Users;
    can: ICan;
    role: Roles;
    sessionId?: string;
  }

  interface Session extends DefaultSession {
    user: Users;
    can: ICan;
    role: Roles;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user: Users;
    can: ICan;
    role: Roles;
    sessionId?: string;
  }
}

export function nextAuthOptions(options: {
  secret: string | undefined;
}): NextAuthOptions {
  return {
    session: {
      strategy: "jwt",
    },
    pages: {
      signIn: "/login",
      error: "/login?error=login+failed",
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      maxAge: 15 * 24 * 30 * 60,
    },
    adapter: PrismaAdapter(db),
    secret: options.secret,
    callbacks: {
      jwt: async ({ token, user: cred }) => {
        if (cred) {
          const { role, can, user, sessionId } = cred;
          token.user = user;
          token.can = can;
          token.role = role;
          token.sessionId = sessionId;
        }

        if (!token.sessionId) return null as any;

        return token;
      },
      session({ session, token }) {
        if (session.user) {
          session.user = token.user;
          session.role = token.role;
          session.can = token.can;
        }

        return session;
      },
    },
    providers: [
      CredentialsProvider({
        name: "Sign in",
        credentials: {
          token: {},
          type: {},
          email: {
            label: "Email",
            type: "email",
            placeholder: "example@example.com",
          },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials) {
            return null;
          }

          return (await loginAction(db, credentials as any)) as any;
        },
      }),
    ],
  };
}
