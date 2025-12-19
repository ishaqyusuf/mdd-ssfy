import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@school-clerk/auth";

const baseUrl =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
    : // : env.VERCEL_ENV === "preview"
      //   ? `https://${env.VERCEL_URL}`
      "http://daarulhadith.localhost:2200";

export const auth = initAuth({
  baseUrl,
  productionUrl: `https://${process.env.NEXT_PUBLIC_APP_URL ?? "turbo.t3.gg"}`,
  secret: process.env.BETTER_AUTH_SECRET,
  //   discordClientId: env.AUTH_DISCORD_ID,
  //   discordClientSecret: env.AUTH_DISCORD_SECRET,
});
// “⌄” U+2304 Down Arrowhead Unicode Character
export type Session = typeof auth.$Infer.Session;
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);
