import { createHash } from "node:crypto";
import type { TRPCContext } from "@api/trpc/init";
import { sendUpstashRestCommand } from "@gnd/cache/upstash-rest";
import { TRPCError } from "@trpc/server";

const memoryWindows = new Map<string, { count: number; resetAt: number }>();

function keyPart(value: string) {
	return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

async function incrementDistributed(key: string, windowSeconds: number) {
	try {
		const count = await sendUpstashRestCommand<number>(["INCR", key]);
		if (count === 1) {
			await sendUpstashRestCommand(["EXPIRE", key, windowSeconds]);
		}
		return count;
	} catch {
		return null;
	}
}

function incrementMemory(key: string, windowSeconds: number) {
	const now = Date.now();
	const existing = memoryWindows.get(key);
	if (!existing || existing.resetAt <= now) {
		memoryWindows.set(key, {
			count: 1,
			resetAt: now + windowSeconds * 1_000,
		});
		return 1;
	}
	existing.count += 1;
	return existing.count;
}

export async function requireStorefrontRateLimit(input: {
	ctx: TRPCContext;
	action: string;
	identity?: string | null;
	limit: number;
	windowSeconds: number;
}) {
	const subject = [
		input.ctx.ipAddress || "unknown",
		input.identity?.trim().toLowerCase() || "anonymous",
	].join(":");
	const key = `storefront:rate:${input.action}:${keyPart(subject)}`;
	const distributed = await incrementDistributed(key, input.windowSeconds);
	const count = distributed ?? incrementMemory(key, input.windowSeconds);
	if (count > input.limit) {
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: "Too many attempts. Please wait and try again.",
		});
	}
}
