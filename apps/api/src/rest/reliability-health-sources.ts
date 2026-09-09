import { createHash } from "node:crypto";
import { z } from "zod";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);
const schema = z
	.array(
		z
			.object({
				provider: z.enum(["trigger", "vercel", "sentry"]),
				mode: z.enum(["incremental", "historical"]).default("incremental"),
				account: identifier,
				project: identifier,
				serviceId: identifier,
				maxAgeMs: z.number().int().min(300_000).max(86_400_000),
			})
			.strict()
			.refine(
				(entry) => entry.provider !== "vercel" || entry.mode === "incremental",
				"Vercel historical discovery is not implemented",
			),
	)
	.min(1)
	.max(10);

export async function readConfiguredReliabilityHealth(
	configuration: string | undefined,
	now: Date,
	read: (
		source: { account: string; project: string; service: { id: string } },
		input: { cursorId: string; now: Date; maxAgeMs: number },
		provider: "trigger" | "vercel" | "sentry",
		mode: "incremental" | "historical",
	) => Promise<{ status: string }>,
) {
	const entries = schema.parse(JSON.parse(configuration ?? "null"));
	const keys = entries.map((entry) =>
		JSON.stringify([
			entry.provider,
			entry.serviceId,
			entry.account,
			entry.project,
			entry.mode,
		]),
	);
	if (new Set(keys).size !== keys.length)
		throw new Error("Duplicate monitor source");
	const results: { status: string }[] = [];
	for (const entry of entries) {
		const cursorId = createHash("sha256")
			.update(
				JSON.stringify([
					{
						trigger: "trigger-runs",
						vercel: "vercel-query",
						sentry: "sentry-events",
					}[entry.provider],
					entry.serviceId,
					entry.account,
					entry.project,
					"production",
					...(entry.mode === "historical" ? ["historical"] : []),
				]),
			)
			.digest("hex");
		results.push(
			await read(
				{
					account: entry.account,
					project: entry.project,
					service: { id: entry.serviceId },
				},
				{ cursorId, now, maxAgeMs: entry.maxAgeMs },
				entry.provider,
				entry.mode,
			),
		);
	}
	return results;
}
