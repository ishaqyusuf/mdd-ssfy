import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getSharedRedisClient } from "@gnd/cache/shared-redis";
import { hasUpstashRestConfig, sendUpstashRestCommand } from "@gnd/cache/upstash-rest";

const WINDOW_SECONDS = 600;
const MAX_ATTEMPTS = 12;
const SCRIPT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n`;

export async function consumeRedemptionAttempt(headers: Headers): Promise<"allowed" | "limited" | "unavailable"> {
  // Only Vercel's overwritten header is trusted in production. Unknown
  // production proxies must add a trusted-IP adapter before enabling exchange.
  const hosted = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);
  const ip = hosted
    ? process.env.VERCEL_ENV === "production" ? headers.get("x-vercel-forwarded-for") : null
    : headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const secret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!ip || !isIP(ip) || !secret || secret.length < 32) return "unavailable";
  const key = `gnd:messaging:redeem:${createHmac("sha256", secret).update(ip).digest("hex")}`;
  try {
    const command = ["EVAL", SCRIPT, 1, key, WINDOW_SECONDS] as const;
    const count = hosted
      ? hasUpstashRestConfig() ? await sendUpstashRestCommand([...command]) : null
      : await getSharedRedisClient().send(command[0], [...command].slice(1));
    const parsed = Number(count);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return "unavailable";
    return parsed > MAX_ATTEMPTS ? "limited" : "allowed";
  } catch {
    return "unavailable";
  }
}
