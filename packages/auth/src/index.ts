import type { BetterAuthOptions } from "better-auth";
// import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db, PrismaClient, Roles, Users } from "@gnd/db";
import { DefaultSession, NextAuthOptions } from "next-auth";
import { loginAction, type ICan } from "./utils";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

declare module "next-auth" {
  interface User {
    user: Users;
    can: ICan;
    role: Roles;
    sessionId?: string;
  }
  interface Session extends DefaultSession {
    // user: {
    user: Users;
    can: ICan;
    role: Roles;
  }
}
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    user: Users;
    can: ICan;
    role: Roles;
  }
}

export const nextAuthOptions = ({ secret }) =>
  ({
    session: {
      strategy: "jwt",
      // strategy: "database",
    },

    pages: {
      signIn: "/login",
      error: "/login?error=login+failed",
    },
    jwt: {
      secret: "super-secret",
      maxAge: 15 * 24 * 30 * 60,
    },
    adapter: PrismaAdapter(new PrismaClient()),
    // secret: process.env.SECRET,
    secret,
    callbacks: {
      jwt: async ({ token, user: cred }) => {
        if (cred) {
          const { role, can, user, sessionId } = cred;
          token.user = user;
          token.can = can;
          token.role = role;
          token.sessionId = sessionId;
        }
        if (!token.sessionId) return null;
        return token;
      },
      session({ session, user, token }) {
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
        async authorize(credentials: any) {
          if (!credentials) {
            return null;
          }
          const login = await loginAction(credentials);
          return login;
        },
      }),
    ],
  }) satisfies NextAuthOptions;

export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  //   discordClientId: string;
  //   discordClientSecret: string;
}) {
  const config = {
    database: prismaAdapter(db, {
      provider: "mysql",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    user: {
      //   fields: {},
      additionalFields: {
        type: {
          type: "string",
          required: true,
        },
      },
    },
    advanced: {
      // cookies:
    },
    emailAndPassword: {
      enabled: true,
      //   sendResetPassword(data, request) {
      //   },
    },
    plugins: [
      //   username({}),
      //   oAuthProxy({
      //     /**
      //      * Auto-inference blocked by https://github.com/better-auth/better-auth/pull/2891
      //      */
      //     currentURL: options.baseUrl,
      //     productionURL: options.productionUrl,
      //   }),
      //   expo(),
    ],
    socialProviders: {
      //   discord: {
      //     clientId: options.discordClientId,
      //     clientSecret: options.discordClientSecret,
      //     redirectURI: `${options.productionUrl}/api/auth/callback/discord`,
      //   },
      // google: {}
    },
    hooks: {},
    // trustedOrigins: [
    //   "expo://",
    //   "*.example.com", // Trust all subdomains of example.com (any protocol)
    //   "https://*.example.com", // Trust only HTTPS subdomains of example.com
    //   "http://*.dev.example.com", // Trust all HTTP subdomains of dev.example.com
    // ],
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
