import { readFile } from "node:fs/promises";

import { evaluateSalesPipelineCutoverGates } from "@gnd/sales/sales-pipeline-rollout";

const valueAfter = (flag: string) => {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
};

async function main() {
	const reportPath = valueAfter("--report");
	if (!reportPath) {
		throw new Error(
			"Provide --report <shadow-report.json>. Cutover cannot be inferred from defaults.",
		);
	}
	const report = JSON.parse(await readFile(reportPath, "utf8")) as {
		unexplainedMembershipDifferences?: number;
		unsafeTransitionDifferences?: number;
		staleProjectionDifferences?: number;
		p95LatencyMs?: number;
		conflictSampleComplete?: boolean;
		operatorApproved?: boolean;
	};
	const maxP95LatencyMs = Number(valueAfter("--max-p95-ms") || 500);
	for (const field of [
		"unexplainedMembershipDifferences",
		"unsafeTransitionDifferences",
		"staleProjectionDifferences",
		"p95LatencyMs",
	] as const) {
		if (!Number.isFinite(report[field])) {
			throw new Error(`Shadow report is missing numeric ${field}.`);
		}
	}
	const result = evaluateSalesPipelineCutoverGates({
		unexplainedMembershipDifferences:
			report.unexplainedMembershipDifferences as number,
		unsafeTransitionDifferences:
			report.unsafeTransitionDifferences as number,
		staleProjectionDifferences:
			report.staleProjectionDifferences as number,
		p95LatencyMs: report.p95LatencyMs as number,
		maxP95LatencyMs,
		conflictSampleComplete: report.conflictSampleComplete === true,
		operatorApproved: report.operatorApproved === true,
	});
	process.stdout.write(
		`${JSON.stringify(
			{
				contract: "sales-pipeline-cutover-gate/v1",
				reportPath,
				maxP95LatencyMs,
				...result,
				rollback: {
					readMode: "legacy",
					commandMode: "legacy",
					preservesCommittedDomainFacts: true,
				},
			},
			null,
			2,
		)}\n`,
	);
	if (!result.passed) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
