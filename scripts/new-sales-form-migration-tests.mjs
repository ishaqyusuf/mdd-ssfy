#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const commands = [
	{
		label: "sales package workflow/domain tests",
		args: [
			"test",
			"packages/sales/src/sales-form/domain/workflow-calculators.test.ts",
			"packages/sales/src/sales-form/domain/dual-pricing.test.ts",
			"packages/sales/src/sales-form/composer/composer.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-line-totals.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-door-actions.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-visible-components.test.ts",
		],
	},
	{
		label: "dealer persistence/query tests",
		args: ["test", "packages/db/src/queries/dealers.test.ts"],
	},
	{
		label: "dealership typecheck",
		args: ["run", "--filter", "@gnd/dealership", "typecheck"],
	},
	{
		label: "www package workflow panel typecheck signal",
		args: ["run", "--filter", "@gnd/www", "typecheck"],
		allowUnrelatedTypecheckFailures: true,
		watchPaths: [
			"apps/www/src/components/forms/new-sales-form/adapters/use-sales-form-workflow-data.ts",
			"apps/www/src/components/forms/new-sales-form/sections/www-sales-form-workflow-panel.tsx",
			"apps/www/src/components/forms/new-sales-form/new-sales-form.tsx",
			"packages/sales/src/sales-form/contracts/workflow-data-source.ts",
			"packages/sales/src/sales-form/ui/workflow/sales-form-workflow-panel.tsx",
		],
	},
];

for (const command of commands) {
	console.log(`\n== ${command.label} ==`);
	const result = spawnSync("bun", command.args, {
		stdio: command.allowUnrelatedTypecheckFailures ? "pipe" : "inherit",
		env: process.env,
		encoding: command.allowUnrelatedTypecheckFailures ? "utf8" : undefined,
	});
	if (result.status !== 0) {
		if (command.allowUnrelatedTypecheckFailures) {
			const output = `${result.stdout || ""}\n${result.stderr || ""}`;
			const failedWatchPaths = command.watchPaths.filter((path) =>
				output.includes(path),
			);
			if (!failedWatchPaths.length) {
				console.log(
					"Typecheck still reports unrelated workspace errors; no watched migration files were mentioned.",
				);
				continue;
			}
			console.log(output);
			console.error(
				`Watched migration files failed typecheck:\n${failedWatchPaths
					.map((path) => `- ${path}`)
					.join("\n")}`,
			);
		}
		process.exit(result.status ?? 1);
	}
	if (command.allowUnrelatedTypecheckFailures) {
		process.stdout.write(result.stdout || "");
		process.stderr.write(result.stderr || "");
	}
}

console.log("\nNew sales form migration gates passed.");
