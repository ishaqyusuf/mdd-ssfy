import type { SentryReadSource } from "@gnd/observability/reliability";
import { z } from "zod";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);
const sourceSchema = z
	.array(
		z
			.object({
				account: z.string().regex(/^[A-Za-z0-9_-]+$/),
				projectId: z.string().regex(/^[A-Za-z0-9_-]+$/),
				apiOrigin: z.enum([
					"https://sentry.io",
					"https://us.sentry.io",
					"https://de.sentry.io",
				]),
				operation: identifier,
				serviceId: identifier,
				owner: identifier,
				tokenEnv: z
					.string()
					.regex(/^RELIABILITY_SENTRY_READ_TOKEN_[A-Z0-9_]+$/),
			})
			.strict(),
	)
	.min(1)
	.max(10);

export async function runConfiguredSentryReconciliation(input: {
	env: Record<string, string | undefined>;
	environment: string;
	mode?: "incremental" | "historical";
	now: () => Date;
	execute: (
		source: SentryReadSource,
		budget: {
			maxPages: number;
			maxDurationMs: number;
			lookbackMs: number;
			mode: "incremental" | "historical";
		},
	) => Promise<{ status: string; pages: number; occurrences: number }>;
}) {
	if (
		input.environment !== "PRODUCTION" ||
		input.env.RELIABILITY_SENTRY_POLL_ENABLED !== "true"
	)
		return { status: "disabled", results: [] };
	let sources: SentryReadSource[];
	try {
		const entries = sourceSchema.parse(
			JSON.parse(input.env.RELIABILITY_SENTRY_READ_SOURCES ?? "null"),
		);
		const scopes = entries.map((entry) =>
			JSON.stringify([entry.account, entry.projectId]),
		);
		if (new Set(scopes).size !== scopes.length)
			throw new Error("Duplicate source");
		sources = entries.map((entry) => {
			const token = input.env[entry.tokenEnv];
			if (!token) throw new Error("Missing token");
			return {
				account: entry.account,
				projectId: entry.projectId,
				apiOrigin: entry.apiOrigin,
				token,
				operation: entry.operation,
				service: {
					id: entry.serviceId,
					owner: entry.owner,
					operations: [entry.operation],
					sources: [
						{
							provider: "sentry",
							account: entry.account,
							project: entry.projectId,
						},
					],
				},
			};
		});
	} catch {
		throw new Error("Invalid Sentry polling configuration");
	}
	const started = input.now().getTime();
	const results: Array<{
		serviceId: string;
		status: string;
		pages: number;
		occurrences: number;
	}> = [];
	for (const source of sources) {
		if (input.now().getTime() - started >= 220_000)
			return { status: "budget_exhausted", results };
		try {
			const result = await input.execute(source, {
				maxPages: 5,
				maxDurationMs: 20_000,
				lookbackMs: input.mode === "historical" ? 7 * 86_400_000 : 86_400_000,
				mode: input.mode ?? "incremental",
			});
			results.push({
				serviceId: source.service.id,
				status: result.status,
				pages: result.pages,
				occurrences: result.occurrences,
			});
		} catch {
			results.push({
				serviceId: source.service.id,
				status: "failed",
				pages: 0,
				occurrences: 0,
			});
		}
	}
	return {
		status: results.some((result) =>
			["failed", "deferred", "lease_lost"].includes(result.status),
		)
			? "attention_required"
			: "complete",
		results,
	};
}
