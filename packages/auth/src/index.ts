import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@gnd/db";
import { compare } from "bcrypt-ts";
import { nextCookies } from "better-auth/next-js";

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
      // usePlural: true,
    }),

    baseURL: options.baseUrl,
    secret: options.secret,
    user: {
      additionalFields: {
        type: {
          type: "string",
          required: true,
        },
      },
    },
    advanced: {
      // database: {
      //   useNumberId: true,
      // },
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
      nextCookies(),
      magicLink({
        sendMagicLink: async ({ email, token, url }, ctx) => {
          // send email to user
        },
      }),
      // organization({
      //   schema: {
      //   }
      // })
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
    trustedOrigins: [
      "expo://",
      "https://www.gndprodesk.com",
      "https://gndprodesk.com",
      "http://localhost:3000",
      "*.example.com", // Trust all subdomains of example.com (any protocol)
      "https://*.example.com", // Trust only HTTPS subdomains of example.com
      "http://*.dev.example.com", // Trust all HTTP subdomains of dev.example.com
    ],
    databaseHooks: {},
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
export type User = Omit<Session["user"], "id"> & { id: number };
