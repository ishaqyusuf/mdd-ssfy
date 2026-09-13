import {
	EVALUATION_FIXTURES,
	createFixtureProvider,
	evaluateSalesRequestFixtures,
} from "../apps/api/src/services/request-generation/evaluation/harness";

function usage() {
	console.log(
		[
			"Usage: bun scripts/evaluate-sales-request-generation.ts [--case=<id>] [--json]",
			"",
			"Default mode uses only hand-authored mock proposals and makes no network calls.",
			"Paid evaluation is available only through run-sales-request-corpus.ts after a one-time prepare-only approval packet is reviewed.",
		].join("\n"),
	);
}

export function selectedFixtures(args: string[]) {
	if (args.includes("--live")) {
		throw new Error(
			"Direct live evaluation is disabled; use the digest-bound run-sales-request-corpus.ts workflow.",
		);
	}
	const caseArgs = args.filter((arg) => arg.startsWith("--case="));
	const caseArg = caseArgs[0];
	if (!caseArg) return EVALUATION_FIXTURES;
	const id = caseArg.slice("--case=".length);
	const fixture = EVALUATION_FIXTURES.find((candidate) => candidate.id === id);
	if (!fixture) throw new Error(`Unknown evaluation case: ${id}`);
	return [fixture];
}

function printReport(
	report: Awaited<ReturnType<typeof evaluateSalesRequestFixtures>>,
) {
	console.log(`Sales request generation evaluation (${report.mode})`);
	console.log(report.note);
	for (const result of report.cases) {
		if (result.status === "error") {
			console.log(
				`- ${result.fixtureId}: error=${result.error}; latency=${result.latencyMs}ms`,
			);
			continue;
		}
		const metrics = result.metrics;
		const usage =
			metrics.inputTokens === null || metrics.outputTokens === null
				? "tokens=unavailable"
				: `tokens=${metrics.inputTokens}/${metrics.outputTokens}`;
		console.log(
			`- ${result.fixtureId}: fields=${metrics.fieldMatches}/${metrics.fieldCount} (${(metrics.fieldMatchRate * 100).toFixed(1)}%), wholeOrder=${metrics.wholeOrderMatch}, unsafeGuesses=${metrics.unsafeGuesses}, latency=${metrics.latencyMs}ms, ${usage}`,
		);
		if (metrics.unsafeGuessPaths.length) {
			console.log(`  unsafe: ${metrics.unsafeGuessPaths.join(", ")}`);
		}
	}
	console.log(
		`Aggregate: wholeOrder=${report.aggregate.wholeOrderMatches}/${report.aggregate.caseCount} (${(report.aggregate.wholeOrderMatchRate * 100).toFixed(1)}%), fields=${report.aggregate.fieldMatches}/${report.aggregate.fieldCount} (${(report.aggregate.fieldMatchRate * 100).toFixed(1)}%), unsafeGuesses=${report.aggregate.unsafeGuesses}, latency=${report.aggregate.latencyMs}ms (avg ${report.aggregate.averageLatencyMs}ms), tokens=${report.aggregate.inputTokens ?? "unavailable"}/${report.aggregate.outputTokens ?? "unavailable"}`,
	);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes("--help")) {
		usage();
		return;
	}
	const fixtures = selectedFixtures(args);
	const report = await evaluateSalesRequestFixtures(
		createFixtureProvider(fixtures),
		fixtures,
		"mock",
	);
	if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
	else printReport(report);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(
			`[sales-request-evaluation] ${error instanceof Error ? error.message : "failed"}`,
		);
		process.exitCode = 1;
	});
}
