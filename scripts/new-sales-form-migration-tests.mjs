#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const toleratedTypecheckBaseline =
	"The www typecheck gate may tolerate existing workspace errors only when none of the watched migration files appear in output.";

const commands = [
	{
		label: "sales package workflow/domain tests",
		args: [
			"test",
			"packages/sales/src/sales-form/domain/workflow-calculators.test.ts",
			"packages/sales/src/sales-form/application/legacy-metadata.test.ts",
			"packages/sales/src/sales-form/contracts/schemas.test.ts",
			"packages/sales/src/sales-form/contracts/workflow-capabilities.test.ts",
			"packages/sales/src/sales-form/ui/workflow/sales-form-engine-panel.test.ts",
			"packages/sales/src/sales-form/ui/workflow/component-image-src.test.ts",
			"packages/sales/src/sales-form/domain/dual-pricing.test.ts",
			"packages/sales/src/sales-form/composer/composer.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-line-totals.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-door-actions.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-moulding-actions.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-selection-actions.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-visible-components.test.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-query-state.test.ts",
			"packages/sales/src/sales-form/ui/workflow/step-family.test.ts",
			"packages/sales/src/sales-template/invoice-print-data.test.ts",
			"packages/sales/src/sync-sales-inventory-line-items.test.ts",
		],
	},
	{
		label: "dealer persistence/query tests",
		args: ["test", "packages/db/src/queries/dealers.test.ts"],
	},
	{
		label: "new sales form api compatibility tests",
		args: ["test", "apps/api/src/db/queries/new-sales-form.test.ts"],
	},
	{
		label: "sales quote overview open params tests",
		args: ["test", "apps/www/src/hooks/sales-overview-open-params.test.ts"],
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
			"apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx",
			"apps/www/src/components/forms/new-sales-form/sections/www-sales-form-workflow-panel.tsx",
			"apps/www/src/components/forms/new-sales-form/new-sales-form.tsx",
			"apps/www/src/hooks/sales-overview-open-params.ts",
			"apps/www/src/hooks/use-sales-overview-open.ts",
			"apps/www/src/hooks/use-sales-overview-query.ts",
			"apps/dealership/src/components/dealer-sales-form/dealer-customer-selector-dialog.tsx",
			"apps/dealership/src/components/dealer-sales-form/dealer-quote-composer.tsx",
			"apps/dealership/src/components/dealer-sales-form/dealer-quote-main-panel.tsx",
			"apps/dealership/src/components/dealer-sales-form/dealer-quote-summary-panel.tsx",
			"apps/www/src/env.mjs",
			"packages/sales/src/sales-form/contracts/form-composition.ts",
			"packages/sales/src/sales-form/contracts/schemas.ts",
			"packages/sales/src/sales-form/contracts/workflow-data-source.ts",
			"packages/sales/src/sales-form/contracts/workflow-capabilities.ts",
			"packages/sales/src/sales-form/application/legacy-metadata.ts",
			"packages/sales/src/sales-form/application/record-normalization.ts",
			"packages/sales/src/sales-form/ui/shell/sales-form-shell.tsx",
			"packages/sales/src/sales-form/ui/overview/invoice-details-panel.tsx",
			"packages/sales/src/sales-form/ui/workflow/component-card-skeleton-grid.tsx",
			"packages/sales/src/sales-form/ui/workflow/door-step-panel.tsx",
			"packages/sales/src/sales-form/ui/workflow/door-supplier-manager.tsx",
			"packages/sales/src/sales-form/ui/workflow/house-package-tool-panel.tsx",
			"packages/sales/src/sales-form/ui/workflow/invoice-item-card.tsx",
			"packages/sales/src/sales-form/ui/workflow/moulding-line-items-editor.tsx",
			"packages/sales/src/sales-form/ui/workflow/moulding-selection-popover.tsx",
			"packages/sales/src/sales-form/ui/workflow/root-component-picker.tsx",
			"packages/sales/src/sales-form/ui/workflow/sales-form-workflow-panel.tsx",
			"packages/sales/src/sales-form/ui/workflow/sales-form-engine-panel.tsx",
			"packages/sales/src/sales-form/ui/workflow/service-line-items-editor.tsx",
			"packages/sales/src/sales-form/ui/workflow/step-component-picker.tsx",
			"packages/sales/src/sales-form/ui/workflow/workflow-component-action-menu.tsx",
			"packages/sales/src/sales-form/ui/workflow/workflow-component-card.tsx",
			"packages/sales/src/sales-form/ui/workflow/workflow-component-grid.tsx",
			"packages/sales/src/sales-form/ui/workflow/workflow-component-toolbar.tsx",
			"packages/sales/src/sales-form/ui/workflow/workflow-panel-notice.tsx",
			"packages/sales/src/sales-form/ui/workflow/workflow-query-state.ts",
			"packages/sales/src/sales-form/ui/workflow/workflow-step-component-panel.tsx",
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
				console.log(toleratedTypecheckBaseline);
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
