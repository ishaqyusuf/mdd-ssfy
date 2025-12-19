import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@gnd/db";
import { compare } from "bcrypt-ts";

export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  //   discordClientId: string;
  //   discordClientSecret: string;
}) {
  const config = {
    basePath: "/api/better-auth",
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
      password: {
        async verify(data) {
          const result = await compare(data.password, data.hash);
          return result;
        },
      },
      //   sendResetPassword(data, request) {
      //   },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, token, url }, ctx) => {
          // send email to user
        },
      }),
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
    databaseHooks: {},
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
