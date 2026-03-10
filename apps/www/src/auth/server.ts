import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@gnd/auth";

function withProtocol(url?: string, protocol: "http" | "https" = "http") {
    if (!url) return undefined;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${protocol}://${url}`;
}

const baseUrl =
    withProtocol(process.env.BETTER_AUTH_URL) ||
    withProtocol(
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.NODE_ENV === "production" ? "https" : "http"
    ) ||
    withProtocol(
        process.env.NEXTAUTH_URL,
        process.env.NODE_ENV === "production" ? "https" : "http"
    ) ||
    "http://localhost:3000";

export const auth = initAuth({
    baseUrl,
    productionUrl:
        withProtocol(process.env.NEXT_PUBLIC_ROOT_DOMAIN, "https") ||
        "https://www.gndprodesk.com",
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
        withProtocol(process.env.NEXT_PUBLIC_APP_URL, "http"),
        withProtocol(process.env.NEXTAUTH_URL, "http"),
        withProtocol(process.env.BETTER_AUTH_URL, "http"),
    ].filter(Boolean) as string[],
    //   discordClientId: env.AUTH_DISCORD_ID,
    //   discordClientSecret: env.AUTH_DISCORD_SECRET,
});
// “⌄” U+2304 Down Arrowhead Unicode Character
export type Session = typeof auth.$Infer.Session;
export const getSession = cache(async () =>
    auth.api.getSession({ headers: await headers() })
);
