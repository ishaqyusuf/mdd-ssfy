import { z } from "zod";
import type { VercelDrainRegistration } from "./reliability-vercel";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);
const schema = z
	.array(
		z
			.object({
				id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
				account: identifier,
				project: identifier,
				operation: identifier,
				serviceId: identifier,
				owner: identifier,
				format: z.enum(["json", "ndjson"]),
				secretEnv: z.string().regex(/^RELIABILITY_VERCEL_SECRET_[A-Z0-9_]+$/),
			})
			.strict(),
	)
	.max(100);

export function resolveVercelDrainRegistration(
	id: string,
	env: Record<string, string | undefined>,
): VercelDrainRegistration | null {
	if (!env.RELIABILITY_VERCEL_DRAINS) return null;
	const entries = schema.parse(JSON.parse(env.RELIABILITY_VERCEL_DRAINS));
	if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
		throw new Error("Duplicate Vercel registration");
	const entry = entries.find((entry) => entry.id === id);
	if (!entry) return null;
	const secret = env[entry.secretEnv];
	if (!secret) throw new Error("Missing Vercel drain secret");
	return {
		secret,
		format: entry.format,
		account: entry.account,
		project: entry.project,
		operation: entry.operation,
		service: {
			id: entry.serviceId,
			owner: entry.owner,
			operations: [entry.operation],
			sources: [
				{ provider: "vercel", account: entry.account, project: entry.project },
			],
		},
	};
}
