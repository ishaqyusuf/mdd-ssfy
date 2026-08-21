#!/usr/bin/env bun

import { getSaleOverview } from "../../apps/api/src/db/queries/sales";
import { PrismaClient } from "../../packages/db/src/index";

const orderNo = process.argv[2] || "09397LM";
const samples = Math.max(3, Number(process.argv[3] || 7));
const db = new PrismaClient({
	log: [{ emit: "event", level: "query" }],
});
let queryCount = 0;
db.$on("query", () => {
	queryCount += 1;
});

function percentile(values: number[], value: number) {
	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.min(
		sorted.length - 1,
		Math.max(0, Math.ceil(sorted.length * value) - 1),
	);
	return sorted[index] ?? 0;
}

async function load() {
	queryCount = 0;
	const startedAt = performance.now();
	const result = await getSaleOverview(
		{ db } as never,
		{ orderNo, salesType: "order" },
	);
	const durationMs = performance.now() - startedAt;
	const serialized = JSON.stringify(result);
	return {
		durationMs,
		queryCount,
		payloadBytes: Buffer.byteLength(serialized),
		rootKeys: result ? Object.keys(result).length : 0,
	};
}

try {
	await load();
	const results = [];
	for (let index = 0; index < samples; index += 1) {
		results.push(await load());
	}
	const durations = results.map((result) => result.durationMs);
	const queries = results.map((result) => result.queryCount);
	const payloads = results.map((result) => result.payloadBytes);
	console.log(
		JSON.stringify(
			{
				orderNo,
				samples,
				latencyMs: {
					min: Math.min(...durations),
					median: percentile(durations, 0.5),
					p95: percentile(durations, 0.95),
					max: Math.max(...durations),
				},
				queryCount: {
					min: Math.min(...queries),
					median: percentile(queries, 0.5),
					max: Math.max(...queries),
				},
				payloadBytes: {
					min: Math.min(...payloads),
					median: percentile(payloads, 0.5),
					max: Math.max(...payloads),
				},
				rootKeys: results[0]?.rootKeys ?? 0,
			},
			null,
			2,
		),
	);
} finally {
	await db.$disconnect();
}
