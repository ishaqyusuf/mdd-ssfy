import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import {
  hasUpstashRestConfig,
  sendUpstashRestCommand,
} from "@gnd/cache/upstash-rest";

export const WEB_LOGIN_IP_LIMIT = 30;
export const WEB_LOGIN_IP_WINDOW_SECONDS = 60;
export const WEB_LOGIN_ACCOUNT_LIMIT = 20;
export const WEB_LOGIN_ACCOUNT_WINDOW_SECONDS = 600;

// Both counters and their first-hit expiries are one Redis operation.
const CONSUME_LOGIN_ATTEMPT_SCRIPT = `
local ipCount = redis.call('INCR', KEYS[1])
if ipCount == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local accountCount = 0
if KEYS[2] then
  accountCount = redis.call('INCR', KEYS[2])
  if accountCount == 1 then redis.call('EXPIRE', KEYS[2], ARGV[2]) end
end
return {ipCount, accountCount}
`;

type LoginLimitDecision =
  | { status: "allowed" }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

type LimiterRuntime = {
  production: boolean;
  vercel: boolean;
  redisConfigured: boolean;
  keySecret?: string;
};

type LoginLimiterDependencies = {
  runtime?: LimiterRuntime;
  command?: (parts: Array<string | number>) => Promise<unknown>;
  timeoutMs?: number;
};

function resolveRuntime(): LimiterRuntime {
  const vercelEnvironment = process.env.VERCEL_ENV;
  return {
    production:
      vercelEnvironment === "production" ||
      (!vercelEnvironment && process.env.NODE_ENV === "production"),
    vercel: vercelEnvironment === "production",
    redisConfigured: hasUpstashRestConfig(),
    keySecret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  };
}

function hashKeySubject(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function trustedVercelIp(headers: Headers): string | null {
  const value =
    headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  return value && isIP(value) !== 0 ? value : null;
}

function parseCounters(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const counters = value.map(Number);
  return counters.every((count) => Number.isSafeInteger(count) && count >= 0)
    ? (counters as [number, number])
    : null;
}

export async function consumeWebLoginAttempt(
  input: { headers: Headers; email?: string | null },
  dependencies: LoginLimiterDependencies = {},
): Promise<LoginLimitDecision> {
  const runtime = dependencies.runtime ?? resolveRuntime();
  if (!runtime.production) return { status: "allowed" };
  // Vercel overwrites its forwarded-IP headers. An unknown production proxy
  // must declare its own trusted-IP adapter before login can be enabled.
  if (!runtime.vercel || !runtime.redisConfigured || !runtime.keySecret) {
    return { status: "unavailable" };
  }

  const ip = trustedVercelIp(input.headers);
  if (!ip) return { status: "unavailable" };

  const keys = [`gnd:auth:prod:login:ip:${hashKeySubject(ip, runtime.keySecret)}`];
  const email = input.email?.trim().toLowerCase();
  if (email) {
    keys.push(`gnd:auth:prod:login:account:${hashKeySubject(email, runtime.keySecret)}`);
  }

  const command = dependencies.command ?? sendUpstashRestCommand;
  const timeoutMs = dependencies.timeoutMs ?? 1_500;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      command([
        "EVAL",
        CONSUME_LOGIN_ATTEMPT_SCRIPT,
        keys.length,
        ...keys,
        WEB_LOGIN_IP_WINDOW_SECONDS,
        WEB_LOGIN_ACCOUNT_WINDOW_SECONDS,
      ]),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Login limiter timed out")), timeoutMs);
      }),
    ]);
    const counters = parseCounters(value);
    if (!counters) return { status: "unavailable" };
    if (counters[0] > WEB_LOGIN_IP_LIMIT) {
      return { status: "limited", retryAfterSeconds: WEB_LOGIN_IP_WINDOW_SECONDS };
    }
    if (counters[1] > WEB_LOGIN_ACCOUNT_LIMIT) {
      return { status: "limited", retryAfterSeconds: WEB_LOGIN_ACCOUNT_WINDOW_SECONDS };
    }
    return { status: "allowed" };
  } catch {
    // Never fall back to a process-local counter on a production login path.
    return { status: "unavailable" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
