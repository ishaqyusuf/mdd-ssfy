import type { VercelLogSource } from "@gnd/observability/reliability";
import { z } from "zod";
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);
const scope = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/);
const schema = z
	.array(
		z
			.object({
				account: scope,
				project: scope,
				operation: identifier,
				serviceId: identifier,
				owner: identifier,
				tokenEnv: z
					.string()
					.regex(/^RELIABILITY_VERCEL_READ_TOKEN_[A-Z0-9_]+$/),
			})
			.strict(),
	)
	.min(1)
	.max(10);
type Runtime = { nodePath: string; cliPath: string; token: string };
type Budget = {
	maxQueries: number;
	maxDurationMs: number;
	lookbackMs: number;
	limit: number;
};
export async function runConfiguredVercelReconciliation(input: {
	env: Record<string, string | undefined>;
	environment: string;
	now: () => Date;
	resolveRuntime?: () => { nodePath: string; cliPath: string };
	execute: (
		source: VercelLogSource,
		runtime: Runtime,
		budget: Budget,
	) => Promise<{ status: string; queries: number; occurrences: number }>;
}) {
	if (
		input.environment !== "PRODUCTION" ||
		input.env.RELIABILITY_VERCEL_POLL_ENABLED !== "true"
	)
		return { status: "disabled", results: [] };
	let sources: { source: VercelLogSource; runtime: Runtime }[];
	try {
		const defaults =
			!input.env.RELIABILITY_VERCEL_NODE_PATH ||
			!input.env.RELIABILITY_VERCEL_CLI_PATH
				? input.resolveRuntime?.()
				: undefined;
		const nodePath = z
			.string()
			.regex(/^\/[^\0]+$/)
			.parse(input.env.RELIABILITY_VERCEL_NODE_PATH ?? defaults?.nodePath);
		const cliPath = z
			.string()
			.regex(/^\/[^\0]+$/)
			.parse(input.env.RELIABILITY_VERCEL_CLI_PATH ?? defaults?.cliPath);
		const entries = schema.parse(
			JSON.parse(input.env.RELIABILITY_VERCEL_READ_SOURCES ?? "null"),
		);
		if (
			new Set(
				entries.map((entry) => JSON.stringify([entry.account, entry.project])),
			).size !== entries.length
		)
			throw new Error("Duplicate source");
		sources = entries.map((entry) => {
			const token = input.env[entry.tokenEnv];
			if (!token) throw new Error("Missing token");
			return {
				runtime: { nodePath, cliPath, token },
				source: {
					account: entry.account,
					project: entry.project,
					operation: entry.operation,
					service: {
						id: entry.serviceId,
						owner: entry.owner,
						operations: [entry.operation],
						sources: [
							{
								provider: "vercel",
								account: entry.account,
								project: entry.project,
							},
						],
					},
				},
			};
		});
	} catch {
		throw new Error("Invalid Vercel polling configuration");
	}
	const started = input.now().getTime();
	const results: {
		serviceId: string;
		status: string;
		queries: number;
		occurrences: number;
	}[] = [];
	for (const { source, runtime } of sources) {
		if (input.now().getTime() - started >= 220_000)
			return { status: "budget_exhausted", results };
		try {
			const result = await input.execute(source, runtime, {
				maxQueries: 5,
				maxDurationMs: 20_000,
				lookbackMs: 3_600_000,
				limit: 100,
			});
			results.push({
				serviceId: source.service.id,
				status: result.status,
				queries: result.queries,
				occurrences: result.occurrences,
			});
		} catch {
			results.push({
				serviceId: source.service.id,
				status: "failed",
				queries: 0,
				occurrences: 0,
			});
		}
	}
	return {
		status: results.some(
			(result) => !["complete", "busy"].includes(result.status),
		)
			? "attention_required"
			: "complete",
		results,
	};
}
