import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { db } from "@gnd/db";

import { percentile95 } from "./sales-pipeline-shadow-report";

type QuerySurface = "list" | "count" | "summary";

type BenchmarkCase = {
	name: string;
	query: Record<string, unknown>;
};

type BenchmarkDependencies = {
	now: () => number;
	run: (surface: QuerySurface, query: Record<string, unknown>) => Promise<void>;
};

export const canonicalSalesOrderBenchmarkCases: BenchmarkCase[] = [
	{
		name: "production-pending",
		query: { showing: "all sales", size: 20, production: "pending" },
	},
	{
		name: "production-due-today",
		query: {
			showing: "all sales",
			size: 20,
			"production.status": "due today",
		},
	},
	{
		name: "fulfillment-pending",
		query: {
			showing: "all sales",
			size: 20,
			"dispatch.status": "pending",
		},
	},
];

export async function measureCanonicalSalesOrderQueries(input: {
	cases?: BenchmarkCase[];
	warmupRuns: number;
	measuredRuns: number;
	thresholdMs: number;
	dependencies: BenchmarkDependencies;
}) {
	const cases = input.cases ?? canonicalSalesOrderBenchmarkCases;
	const samples: Array<{
		case: string;
		surface: QuerySurface;
		run: number;
		durationMs: number;
	}> = [];
	const surfaces: QuerySurface[] = ["list", "count", "summary"];
	const totalRuns = input.warmupRuns + input.measuredRuns;
	for (const benchmarkCase of cases) {
		for (let run = 0; run < totalRuns; run += 1) {
			for (const surface of surfaces) {
				const startedAt = input.dependencies.now();
				await input.dependencies.run(surface, benchmarkCase.query);
				const durationMs = input.dependencies.now() - startedAt;
				if (run >= input.warmupRuns) {
					samples.push({
						case: benchmarkCase.name,
						surface,
						run: run - input.warmupRuns + 1,
						durationMs,
					});
				}
			}
		}
	}
	const durations = samples.map((sample) => sample.durationMs);
	const p95LatencyMs = percentile95(durations);
	return {
		p95LatencyMs,
		maxLatencyMs: durations.length ? Math.max(...durations) : 0,
		thresholdMs: input.thresholdMs,
		acceptable: p95LatencyMs <= input.thresholdMs,
		samples,
	};
}

function integerAfter(flag: string, fallback: number) {
	const index = process.argv.indexOf(flag);
	const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
	return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function valueAfter(flag: string) {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
	process.env.SALES_PIPELINE_READ_MODE = "canonical";
	process.env.GND_SALES_ORDERS_READ_MODEL_MODE = "off";
	process.env.GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE = "0";
	const [{ getOrders, getOrdersCount, getOrdersSummary }] = await Promise.all([
		import("../apps/api/src/db/queries/sales-orders-v2"),
	]);
	const context = {
		db,
		userId: integerAfter("--user-id", 1),
		requestId: "sales-pipeline-local-query-benchmark",
	};
	const startedAt = new Date();
	const warmupRuns = integerAfter("--warmup-runs", 1);
	const measuredRuns = integerAfter("--measured-runs", 4);
	const thresholdMs = integerAfter("--threshold-ms", 500);
	const measurement = await measureCanonicalSalesOrderQueries({
		warmupRuns,
		measuredRuns,
		thresholdMs,
		dependencies: {
			now: () => performance.now(),
			run: async (surface, query) => {
				if (surface === "list") {
					await getOrders(context, query as never);
				} else if (surface === "count") {
					await getOrdersCount(context, query as never);
				} else {
					await getOrdersSummary(context, query as never);
				}
			},
		},
	});
	const finishedAt = new Date();
	const report = {
		contract: "sales-pipeline-query-benchmark/v1",
		mode: "read-only",
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		durationMs: finishedAt.getTime() - startedAt.getTime(),
		warmupRuns,
		measuredRuns,
		caseCount: canonicalSalesOrderBenchmarkCases.length,
		surfaces: ["list", "count", "summary"],
		...measurement,
		safety: { writesPerformed: false },
	};
	const serialized = `${JSON.stringify(report, null, 2)}\n`;
	const output = valueAfter("--output");
	if (output) await writeFile(resolve(output), serialized, "utf8");
	process.stdout.write(serialized);
	if (!report.acceptable) process.exitCode = 1;
}

if (import.meta.main) {
	main()
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		})
		.finally(async () => db.$disconnect());
}
