#!/usr/bin/env bun
import { resolve } from "node:path";
import { collectGndEvidence } from "../.release/gnd-evidence-collector";

function value(name: string) {
	const index = Bun.argv.indexOf(name);
	const found = index >= 0 ? Bun.argv[index + 1] : undefined;
	if (!found) throw new Error(`Missing ${name}.`);
	return found;
}

try {
	const environment = value("--env");
	if (!["preview", "production"].includes(environment)) {
		throw new Error("Use --env preview or --env production.");
	}
	const repository = resolve(value("--repo"));
	const trustedRepository = resolve(value("--trusted-repo"));
	const bundle = await collectGndEvidence({
		environment: environment as "preview" | "production",
		revision: value("--revision"),
		repository,
		trustedRepository,
		outputPath: value("--output"),
	});
	console.log(
		JSON.stringify({
			project: bundle.project,
			environment: bundle.environment,
			revision: bundle.revision,
			receipts: bundle.receipts.map((receipt) => ({
				targetId: receipt.targetId,
				provider: receipt.provider,
				revision: receipt.revision,
			})),
		}),
	);
} catch (error) {
	console.error(
		error instanceof Error
			? error.message
			: "Release evidence collection failed.",
	);
	process.exitCode = 2;
}
