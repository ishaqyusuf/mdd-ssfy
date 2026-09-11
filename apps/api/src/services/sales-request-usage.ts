import { resolveCacheNamespace } from "@gnd/cache/redis-client";
import {
	getSharedRedisClient,
	waitForRedisReady,
} from "@gnd/cache/shared-redis";
import { sendUpstashRestCommand } from "@gnd/cache/upstash-rest";
import { TRPCError } from "@trpc/server";

const incrementWindow =
	"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n";

async function reserve(userId: number) {
	const key = `gnd:${resolveCacheNamespace()}:sales-request-usage:${userId}`;
	const args = [incrementWindow, "1", key, "60"];
	if (!process.env.REDIS_URL) return sendUpstashRestCommand(["EVAL", ...args]);
	if (!(await waitForRedisReady())) throw new Error("Usage store unavailable");
	return getSharedRedisClient().send("EVAL", args);
}

/** A shared atomic per-user window; outages fail closed before paid generation. */
export async function requireSalesRequestUsage(
	userId: number,
	increment = reserve,
) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let count: number;
	try {
		const result = await Promise.race([
			increment(userId),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error("Usage timeout")), 1500);
			}),
		]);
		count = Number(result);
		if (!Number.isSafeInteger(count) || count < 1)
			throw new Error("Invalid usage response");
	} catch {
		throw new TRPCError({
			code: "SERVICE_UNAVAILABLE",
			message:
				"Request generation usage checks are unavailable. Try again shortly.",
		});
	} finally {
		clearTimeout(timer);
	}
	if (count > 5)
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message:
				"You can generate five request previews per minute. Try again shortly.",
		});
}
