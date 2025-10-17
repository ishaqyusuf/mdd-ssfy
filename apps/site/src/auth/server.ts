import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@gnd/auth";
import { env } from "@/env.mjs";

const baseUrl =
  env.NODE_ENV === "production"
    ? `https://${env.NEXT_PUBLIC_APP_URL}`
    : // : env.VERCEL_ENV === "preview"
      //   ? `https://${env.VERCEL_URL}`
      "http://localhost:3500";

export const auth = initAuth({
  baseUrl,
  productionUrl: `https://${env.NEXT_PUBLIC_APP_URL ?? "turbo.t3.gg"}`,
  secret: env.NEXTAUTH_SECRET,
  //   discordClientId: env.AUTH_DISCORD_ID,
  //   discordClientSecret: env.AUTH_DISCORD_SECRET,
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);
