import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

import {
  WEB_LOGIN_ACCOUNT_LIMIT,
  WEB_LOGIN_ACCOUNT_WINDOW_SECONDS,
  WEB_LOGIN_IP_LIMIT,
  WEB_LOGIN_IP_WINDOW_SECONDS,
  consumeWebLoginAttempt,
} from "./www-login-limiter";

const protectedRuntime = {
  production: true,
  vercel: true,
  redisConfigured: true,
  keySecret: "test-only-key",
};
const trustedHeaders = new Headers({ "x-vercel-forwarded-for": "203.0.113.5" });

describe("distributed web/mobile login attempt boundary", () => {
  it("does not use Redis for local development", async () => {
    let calls = 0;
    const decision = await consumeWebLoginAttempt(
      { headers: new Headers(), email: "staff@example.com" },
      {
        runtime: { ...protectedRuntime, production: false },
        command: async () => {
          calls++;
          return [1, 1];
        },
      },
    );
    expect(decision).toEqual({ status: "allowed" });
    expect(calls).toBe(0);
  });

  it("fails closed without a trusted production proxy, Redis, or IP", async () => {
    for (const [runtime, headers] of [
      [{ ...protectedRuntime, vercel: false }, trustedHeaders],
      [{ ...protectedRuntime, redisConfigured: false }, trustedHeaders],
      [{ ...protectedRuntime, keySecret: "" }, trustedHeaders],
      [protectedRuntime, new Headers()],
      [protectedRuntime, new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })],
    ] as const) {
      expect(
        await consumeWebLoginAttempt(
          { headers, email: "staff@example.com" },
          { runtime, command: async () => [1, 1] },
        ),
      ).toEqual({ status: "unavailable" });
    }
  });

  it("atomically consumes hashed IP and account counters without storing raw identifiers", async () => {
    let parts: Array<string | number> = [];
    const decision = await consumeWebLoginAttempt(
      { headers: trustedHeaders, email: "  STAFF@Example.com  " },
      {
        runtime: protectedRuntime,
        command: async (command) => {
          parts = command;
          return [1, 1];
        },
      },
    );
    expect(decision).toEqual({ status: "allowed" });
    expect(parts[0]).toBe("EVAL");
    expect(parts[2]).toBe(2);
    expect(String(parts[1]).includes("redis.call('INCR', KEYS[1])")).toBe(true);
    expect(String(parts[1]).includes("redis.call('EXPIRE', KEYS[2], ARGV[2])")).toBe(true);
    expect(parts.at(-2)).toBe(WEB_LOGIN_IP_WINDOW_SECONDS);
    expect(parts.at(-1)).toBe(WEB_LOGIN_ACCOUNT_WINDOW_SECONDS);
    expect(JSON.stringify(parts).includes("203.0.113.5")).toBe(false);
    expect(JSON.stringify(parts).includes("staff@example.com")).toBe(false);
    expect(JSON.stringify(parts).includes("test-only-key")).toBe(false);
    expect(/^gnd:auth:prod:login:ip:[a-f0-9]{64}$/.test(String(parts[3]))).toBe(true);
    expect(/^gnd:auth:prod:login:account:[a-f0-9]{64}$/.test(String(parts[4]))).toBe(true);
    let rotatedKey = "";
    await consumeWebLoginAttempt(
      { headers: trustedHeaders, email: "staff@example.com" },
      {
        runtime: { ...protectedRuntime, keySecret: "different-test-key" },
        command: async (command) => {
          rotatedKey = String(command[4]);
          return [1, 1];
        },
      },
    );
    expect(rotatedKey === parts[4]).toBe(false);
  });

  it("enforces both count windows and keeps missing email on the IP boundary", async () => {
    for (const [counts, expected] of [
      [[WEB_LOGIN_IP_LIMIT, WEB_LOGIN_ACCOUNT_LIMIT], { status: "allowed" }],
      [
        [WEB_LOGIN_IP_LIMIT + 1, 0],
        { status: "limited", retryAfterSeconds: WEB_LOGIN_IP_WINDOW_SECONDS },
      ],
      [
        [1, WEB_LOGIN_ACCOUNT_LIMIT + 1],
        { status: "limited", retryAfterSeconds: WEB_LOGIN_ACCOUNT_WINDOW_SECONDS },
      ],
    ] as const) {
      expect(
        await consumeWebLoginAttempt(
          { headers: trustedHeaders, email: "staff@example.com" },
          { runtime: protectedRuntime, command: async () => counts },
        ),
      ).toEqual(expected);
    }
    let keyCount = 0;
    expect(
      await consumeWebLoginAttempt(
        { headers: trustedHeaders },
        {
          runtime: protectedRuntime,
          command: async (parts) => {
            keyCount = Number(parts[2]);
            return [1, 0];
          },
        },
      ),
    ).toEqual({ status: "allowed" });
    expect(keyCount).toBe(1);
  });

  it("fails closed on malformed responses, command errors, and timeout", async () => {
    for (const command of [
      async () => null,
      async () => ["NaN", 1],
      async () => {
        throw new Error("redis unavailable");
      },
      async () => new Promise<never>(() => {}),
    ]) {
      expect(
        await consumeWebLoginAttempt(
          { headers: trustedHeaders, email: "staff@example.com" },
          { runtime: protectedRuntime, command, timeoutMs: 5 },
        ),
      ).toEqual({ status: "unavailable" });
    }
  });

  it("guards both custom password endpoints before legacy-user lookup", async () => {
    const source = await readFile(require.resolve("./www.ts"), "utf8");
    expect(source.match(/await requireWebLoginAttemptLimit\(/g)?.length).toBe(2);
    for (const name of ["/www-legacy-sign-in", "/www-mobile-sign-in"]) {
      const endpoint = (source.split(name)[1] ?? "").split("const legacyLogin")[0] ?? "";
      expect(endpoint.includes("await requireWebLoginAttemptLimit(")).toBe(true);
    }
  });
});
