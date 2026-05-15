import { db } from "@gnd/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

function getDealershipBaseUrl() {
  if (process.env.NEXT_PUBLIC_DEALERSHIP_URL) {
    return process.env.NEXT_PUBLIC_DEALERSHIP_URL.replace(/\/$/, "");
  }

  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "https://dealers.gndprodesk.com";
  }

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:4200";
}

function getTrustedOrigins() {
  return Array.from(
    new Set(
      [
        getDealershipBaseUrl(),
        process.env.NEXT_PUBLIC_DEALERSHIP_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.BETTER_AUTH_TRUSTED_ORIGINS,
      ]
        .flatMap((value) => value?.split(",") ?? [])
        .map((value) => value.trim().replace(/\/$/, ""))
        .filter(Boolean),
    ),
  );
}

export const dealerAuth = betterAuth({
  appName: "GND Dealership",
  baseURL: getDealershipBaseUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: getTrustedOrigins(),
  database: prismaAdapter(db as never, {
    provider: "mysql",
  }),
  user: {
    modelName: "DealerAuthUser",
  },
  session: {
    modelName: "DealerAuthSession",
  },
  account: {
    modelName: "DealerAuthAccount",
  },
  verification: {
    modelName: "DealerAuthVerification",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [nextCookies()],
});

export type DealerAuthSession = typeof dealerAuth.$Infer.Session;

export async function getDealerAuthSession(headers: Headers) {
  return dealerAuth.api.getSession({
    headers,
  });
}
