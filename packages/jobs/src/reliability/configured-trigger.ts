import type { TriggerReadSource } from "@gnd/observability/reliability";
import { z } from "zod";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);
const schema = z
	.array(
		z
			.object({
				account: identifier,
				project: identifier,
				environmentId: identifier,
				serviceId: identifier,
				owner: identifier,
				fallbackOperation: identifier,
				operations: z
					.array(z.object({ task: identifier, operation: identifier }).strict())
					.max(200),
				tokenEnv: z
					.string()
					.regex(/^RELIABILITY_TRIGGER_READ_TOKEN_[A-Z0-9_]+$/),
			})
			.strict(),
	)
	.min(1)
	.max(10);

export async function runConfiguredTriggerReconciliation(input: {
	env: Record<string, string | undefined>;
	environment: string;
	mode?: "incremental" | "historical";
	now: () => Date;
	execute: (
		source: TriggerReadSource,
		budget: {
			maxPages: number;
			maxWatches: number;
			maxDurationMs: number;
			lookbackMs: number;
			mode: "incremental" | "historical";
		},
	) => Promise<{
		status: string;
		pages: number;
		runs: number;
		watchFailures: number;
	}>;
}) {
	if (
		input.environment !== "PRODUCTION" ||
		input.env.RELIABILITY_TRIGGER_POLL_ENABLED !== "true"
	)
		return { status: "disabled", results: [] };
	let sources: TriggerReadSource[];
	try {
		const entries = schema.parse(
			JSON.parse(input.env.RELIABILITY_TRIGGER_READ_SOURCES ?? "null"),
		);
		const scopes = entries.map((entry) =>
			JSON.stringify([entry.account, entry.project]),
		);
		if (new Set(scopes).size !== scopes.length)
			throw new Error("Duplicate source");
		sources = entries.map((entry) => {
			const token = input.env[entry.tokenEnv];
			if (
				!token?.startsWith("tr_prod_") ||
				new Set(entry.operations.map((mapping) => mapping.task)).size !==
					entry.operations.length
			)
				throw new Error("Invalid source");
			return {
				account: entry.account,
				project: entry.project,
				environmentId: entry.environmentId,
				token,
				fallbackOperation: entry.fallbackOperation,
				operations: entry.operations,
				service: {
					id: entry.serviceId,
					owner: entry.owner,
					operations: [
						...new Set([
							entry.fallbackOperation,
							...entry.operations.map((mapping) => mapping.operation),
						]),
					],
					sources: [
						{
							provider: "trigger",
							account: entry.account,
							project: entry.project,
						},
					],
				},
			};
		});
	} catch {
		throw new Error("Invalid Trigger polling configuration");
	}
	const started = input.now().getTime();
	const results: Array<{
		serviceId: string;
		status: string;
		pages: number;
		runs: number;
		watchFailures: number;
	}> = [];
	for (const source of sources) {
		if (input.now().getTime() - started >= 220_000)
			return { status: "budget_exhausted", results };
		try {
			const result = await input.execute(source, {
				maxPages: 5,
				maxWatches: 20,
				maxDurationMs: 20_000,
				lookbackMs: input.mode === "historical" ? 7 * 86_400_000 : 86_400_000,
				mode: input.mode ?? "incremental",
			});
			results.push({
				serviceId: source.service.id,
				status: result.status,
				pages: result.pages,
				runs: result.runs,
				watchFailures: result.watchFailures,
			});
		} catch {
			results.push({
				serviceId: source.service.id,
				status: "failed",
				pages: 0,
				runs: 0,
				watchFailures: 0,
			});
		}
	}
	return {
		status: results.some((result) =>
			["failed", "deferred", "lease_lost", "attention_required"].includes(
				result.status,
			),
		)
			? "attention_required"
			: "complete",
		results,
	};
}
