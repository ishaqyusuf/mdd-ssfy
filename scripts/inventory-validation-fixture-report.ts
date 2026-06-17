#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost/gnd-prisma2";

type CliOptions = {
	json: boolean;
	markdown: boolean;
	seedChecklist: boolean;
	seedBlueprint: boolean;
	evidenceTemplate: boolean;
	mutationSnapshot: boolean;
	completionGate: boolean;
	failOnBlocked: boolean;
};

class UsageError extends Error {}

function usage() {
	console.log(
		[
			"Usage:",
			"  bun scripts/inventory-validation-fixture-report.ts",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/inventory-validation-fixture-report.ts --json",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/inventory-validation-fixture-report.ts --markdown",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/inventory-validation-fixture-report.ts --seed-checklist",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/inventory-validation-fixture-report.ts --seed-blueprint",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/inventory-validation-fixture-report.ts --evidence-template",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/inventory-validation-fixture-report.ts --mutation-snapshot",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/inventory-validation-fixture-report.ts --completion-gate",
			"",
			"Options:",
			"  --json             Print the full machine-readable report payload",
			"  --markdown         Print a Markdown snapshot for Brain evidence docs",
			"  --seed-checklist   Print grouped setup actions for missing seed fixtures",
			"  --seed-blueprint   Print a read-only row blueprint for missing seed fixtures",
			"  --evidence-template Print a Markdown worksheet for browser mutation evidence",
			"  --mutation-snapshot Print exact fixture-row state for before/after browser evidence",
			"  --completion-gate Print the Pending 15 cutover gate checklist",
			"  --fail-on-blocked  Exit 1 when required validation fixtures are missing",
		].join("\n"),
	);
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		json: false,
		markdown: false,
		seedChecklist: false,
		seedBlueprint: false,
		evidenceTemplate: false,
		mutationSnapshot: false,
		completionGate: false,
		failOnBlocked: false,
	};

	for (const arg of argv) {
		if (arg == "--help" || arg == "-h") {
			usage();
			process.exit(0);
		}
		if (arg == "--json") {
			options.json = true;
			continue;
		}
		if (arg == "--markdown") {
			options.markdown = true;
			continue;
		}
		if (arg == "--seed-checklist") {
			options.seedChecklist = true;
			continue;
		}
		if (arg == "--seed-blueprint") {
			options.seedBlueprint = true;
			continue;
		}
		if (arg == "--evidence-template") {
			options.evidenceTemplate = true;
			continue;
		}
		if (arg == "--mutation-snapshot") {
			options.mutationSnapshot = true;
			continue;
		}
		if (arg == "--completion-gate") {
			options.completionGate = true;
			continue;
		}
		if (arg == "--fail-on-blocked") {
			options.failOnBlocked = true;
			continue;
		}
		throw new UsageError(`Unknown argument: ${arg}`);
	}

	const outputModeCount = [
		options.json,
		options.markdown,
		options.seedChecklist,
		options.seedBlueprint,
		options.evidenceTemplate,
		options.mutationSnapshot,
		options.completionGate,
	].filter(Boolean).length;
	if (outputModeCount > 1) {
		throw new UsageError(
			"Choose only one output mode: --json, --markdown, --seed-checklist, --seed-blueprint, --evidence-template, --mutation-snapshot, or --completion-gate",
		);
	}

	return options;
}

function redactDatabaseUrl(value: string | undefined) {
	if (!value) return "<unset>";
	try {
		const url = new URL(value);
		url.username = url.username ? "redacted" : "";
		url.password = url.password ? "redacted" : "";
		return url.toString();
	} catch {
		return "<redacted>";
	}
}

function formatSample(sample: {
	id: number;
	saleId?: number | null;
	orderId?: string | null;
	lineItemId?: number | null;
	inventoryName?: string | null;
	variantSku?: string | null;
	status?: string | null;
	qty?: number | null;
	qtyReceived?: number | null;
	stockQty?: number | null;
	fixtureKey?: string | null;
}) {
	const fields = [
		sample.fixtureKey ? `fixture=${sample.fixtureKey}` : null,
		`id=${sample.id}`,
		sample.saleId ? `sale=${sample.saleId}` : null,
		sample.orderId ? `order=${sample.orderId}` : null,
		sample.lineItemId ? `line=${sample.lineItemId}` : null,
		sample.inventoryName ? `item=${sample.inventoryName}` : null,
		sample.variantSku ? `sku=${sample.variantSku}` : null,
		sample.status ? `status=${sample.status}` : null,
		sample.qty != null ? `qty=${sample.qty}` : null,
		sample.qtyReceived != null ? `received=${sample.qtyReceived}` : null,
		sample.stockQty != null ? `stock=${sample.stockQty}` : null,
	].filter(Boolean);

	return fields.join(" ");
}

function formatWorkflowSamples(workflow: {
	candidateSamples: Array<Parameters<typeof formatSample>[0]>;
}) {
	return workflow.candidateSamples.length
		? workflow.candidateSamples.map(formatSample).join("; ")
		: "";
}

function formatWorkflowPrimarySample(workflow: {
	primarySample?: Parameters<typeof formatSample>[0] | null;
}) {
	return workflow.primarySample ? formatSample(workflow.primarySample) : "";
}

function escapeMarkdownCell(value: unknown) {
	return String(value ?? "")
		.replaceAll("|", "\\|")
		.replace(/\s+/g, " ")
		.trim();
}

function printMarkdownReport(payload: {
	generatedAt: string;
	databaseUrl: string;
	report: Awaited<
		ReturnType<
			typeof import("../packages/inventory/src/inventory").inventoryBrowserValidationFixtureReport
		>
	>;
}) {
	const { report } = payload;

	console.log("## Inventory Fixture Preflight Snapshot");
	console.log("");
	console.log(`- Generated: ${payload.generatedAt}`);
	console.log(`- Database: \`${payload.databaseUrl}\``);
	console.log(`- Status: \`${report.status}\``);
	console.log(
		`- Summary: ${report.summary.readyFixtureCount}/${report.summary.requiredFixtureCount} ready, ${report.summary.missingFixtureCount} missing`,
	);
	console.log(`- Next action: ${report.nextAction}`);
	console.log("");

	if (report.diagnostics.seedFixturesToPrepare.length) {
		console.log("### Seed Fixtures To Prepare");
		console.log("");
		console.log("| Seed Fixture | Missing Categories | Plan |");
		console.log("| --- | ---: | --- |");
		for (const seed of report.diagnostics.seedFixturesToPrepare) {
			console.log(
				`| \`${seed.seedFixtureId}\` | ${seed.missingCount} | \`${escapeMarkdownCell(
					seed.seedPlanHref,
				)}\` |`,
			);
		}
		console.log("");
	}

	console.log("### Fixture Readiness");
	console.log("");
	console.log(
		"| Fixture | Status | Count | Seed Fixture | Workspace | Sample | Count Diagnostic |",
	);
	console.log("| --- | --- | ---: | --- | --- | --- | --- |");
	for (const fixture of report.fixtures) {
		const sample = fixture.samples[0];
		const countDiagnostic = fixture.countDiagnostic.complete
			? fixture.countDiagnostic.countSource
			: [
					"incomplete",
					fixture.countDiagnostic.scanLimit != null
						? `scan ${fixture.countDiagnostic.scanLimit}`
						: null,
					fixture.countDiagnostic.scannedCount != null
						? `checked ${fixture.countDiagnostic.scannedCount}`
						: null,
					fixture.countDiagnostic.candidateCount != null
						? `candidates ${fixture.countDiagnostic.candidateCount}`
						: null,
				]
					.filter(Boolean)
					.join(", ");
		console.log(
			`| ${escapeMarkdownCell(fixture.label)} | ${
				fixture.ready ? "Ready" : "Missing"
			} | ${fixture.count}/${fixture.requiredCount} | \`${
				fixture.seedFixtureId
			}\` | \`${escapeMarkdownCell(fixture.workspaceHref)}\` | ${escapeMarkdownCell(
				sample ? formatSample(sample) : "",
			)} | ${escapeMarkdownCell(countDiagnostic)} |`,
		);
	}
	console.log("");
	console.log("### Browser Mutation Matrix");
	console.log("");
	console.log(
		`- Runnable: ${report.summary.readyWorkflowCount}/${report.summary.requiredWorkflowCount}`,
	);
	console.log("");
	console.log(
		"| Run | Workflow | Status | Phase | Workspace | Required Fixtures | Use Sample | Candidate Samples | Guard | Expected Evidence |",
	);
	console.log("| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
	for (const workflow of report.workflowMatrix) {
		console.log(
			`| ${workflow.runOrder} | ${escapeMarkdownCell(workflow.label)} | ${
				workflow.ready ? "Runnable" : "Blocked"
			} | ${escapeMarkdownCell(workflow.phase)} | \`${escapeMarkdownCell(
				workflow.workspaceHref,
			)}\` | ${escapeMarkdownCell(workflow.fixtureKeys.join(", "))} | ${escapeMarkdownCell(
				formatWorkflowPrimarySample(workflow),
			)} | ${escapeMarkdownCell(
				formatWorkflowSamples(workflow),
			)} | ${escapeMarkdownCell(
				workflow.operatorGuard,
			)} | ${escapeMarkdownCell(
				workflow.expectedEvidence,
			)} |`,
		);
	}
}

function printEvidenceTemplate(payload: {
	generatedAt: string;
	databaseUrl: string;
	report: Awaited<
		ReturnType<
			typeof import("../packages/inventory/src/inventory").inventoryBrowserValidationFixtureReport
		>
	>;
}) {
	const { report } = payload;

	console.log("## Inventory Browser Mutation Evidence Template");
	console.log("");
	console.log(`- Generated: ${payload.generatedAt}`);
	console.log(`- Database: \`${payload.databaseUrl}\``);
	console.log(`- Fixture status: \`${report.status}\``);
	console.log(
		`- Fixture readiness: ${report.summary.readyFixtureCount}/${report.summary.requiredFixtureCount}`,
	);
	console.log(
		`- Workflow readiness: ${report.summary.readyWorkflowCount}/${report.summary.requiredWorkflowCount}`,
	);
	console.log("");

	if (report.status != "ready") {
		console.log(
			"> Do not run mutating browser validation yet. Complete the missing fixture groups first.",
		);
		console.log("");
	}

	console.log("### Snapshot Steps");
	console.log("");
	console.log(
		"1. Before browser actions, run `bun run inventory:validation-fixtures --mutation-snapshot` and paste the output into the evidence notes.",
	);
	console.log(
		"2. Run the browser actions in the `Run` order below, using each row's `Use Sample` and `Guard` values.",
	);
	console.log(
		"3. After browser actions, run `bun run inventory:validation-fixtures --mutation-snapshot` again and compare allocation statuses, inbound quantities, line projections, stock rows, and delivery compatibility rows.",
	);
	console.log(
		"4. In both snapshots, use the `Primary Proof Target Index` first, then compare each row's `Compare Fields` and `Expected Delta` in the detail tables; allocation rows also expose `proofRole` for lifecycle-state auditing.",
	);
	console.log("");

	console.log("| Run | Workflow | Status | Workspace | Use Sample | Candidate Samples | Compare Fields | Expected Delta | Before | Action | Guard | After | Result | Evidence Link/Note |");
	console.log("| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
	for (const workflow of report.workflowMatrix) {
		console.log(
			`| ${workflow.runOrder} | ${escapeMarkdownCell(workflow.label)} | ${
				workflow.ready ? "Pending Run" : "Blocked"
			} | \`${escapeMarkdownCell(workflow.workspaceHref)}\` | ${escapeMarkdownCell(
				formatWorkflowPrimarySample(workflow),
			)} | ${escapeMarkdownCell(
				formatWorkflowSamples(workflow),
			)} | ${escapeMarkdownCell(
				compareFieldsForRunOrder(workflow.runOrder),
			)} | ${escapeMarkdownCell(
				expectedDeltaForRunOrder(workflow.runOrder),
			)} | TODO | ${escapeMarkdownCell(workflow.operatorAction)} | ${escapeMarkdownCell(
				workflow.operatorGuard,
			)} | TODO | TODO | ${escapeMarkdownCell(
				workflow.expectedEvidence,
			)} |`,
		);
	}
}

const COMPLETION_GATE_PHASES = [
	{
		label: "Allocation review",
		runOrders: [10, 20, 30],
		evidence:
			"approve, reject/release, and bulk approve rows prove allocation review behavior without reusing the same pending allocation",
	},
	{
		label: "Inventory dispatch fulfillment",
		runOrders: [40, 50, 60, 70],
		evidence:
			"assign, pack, fulfill, and release rows prove reserved/picked/consumed/released allocation transitions and delivery compatibility output",
	},
	{
		label: "Inbound and received backorder",
		runOrders: [80, 90],
		evidence:
			"receive and release rows prove received quantity delta handling, inbound demand status updates, and backorder release",
	},
	{
		label: "Partial shipment and hold",
		runOrders: [100, 110],
		evidence:
			"ship-available and held-line rows prove partial shipment does not consume hold-until-complete lines",
	},
	{
		label: "Stock operations and low-stock signal",
		runOrders: [120, 130],
		evidence:
			"stock adjustment and low-stock rows prove physical stock/audit movement plus read-only low-stock dashboard signal",
	},
];

function printCompletionGate(payload: {
	generatedAt: string;
	databaseUrl: string;
	report: Awaited<
		ReturnType<
			typeof import("../packages/inventory/src/inventory").inventoryBrowserValidationFixtureReport
		>
	>;
}) {
	const { report } = payload;
	const workflowsByRun = new Map(
		report.workflowMatrix.map((workflow) => [workflow.runOrder, workflow]),
	);
	const allWorkflowsReady =
		report.summary.readyWorkflowCount == report.summary.requiredWorkflowCount;
	const readyForBrowser = report.status == "ready" && allWorkflowsReady;

	console.log("## Inventory Pending 15 Completion Gate");
	console.log("");
	console.log(`- Generated: ${payload.generatedAt}`);
	console.log(`- Database: \`${payload.databaseUrl}\``);
	console.log(`- Fixture status: \`${report.status}\``);
	console.log(
		`- Fixture readiness: ${report.summary.readyFixtureCount}/${report.summary.requiredFixtureCount}`,
	);
	console.log(
		`- Workflow readiness: ${report.summary.readyWorkflowCount}/${report.summary.requiredWorkflowCount}`,
	);
	console.log(
		`- Decision: ${
			readyForBrowser
				? "Ready for approval-gated browser mutation evidence; not complete until before/after snapshots and worksheet results are attached."
				: "Blocked; prepare missing fixture groups before browser mutation evidence."
		}`,
	);
	console.log("");

	console.log("### Required Evidence Gates");
	console.log("");
	console.log("| Gate | Status | Required Evidence |");
	console.log("| --- | --- | --- |");
	console.log(
		`| Fixture preflight | ${
			report.status == "ready" ? "Ready" : "Blocked"
		} | \`bun run inventory:validation-fixtures --markdown\` shows all required fixture groups ready. |`,
	);
	console.log(
		"| Before snapshot | Pending Manual Evidence | Run and attach `bun run inventory:validation-fixtures --mutation-snapshot` before browser actions. |",
	);
	console.log(
		`| Browser workflow matrix | ${
			allWorkflowsReady ? "Ready" : "Blocked"
		} | Run all ready rows in run order and fill the evidence worksheet with before/action/after/result notes. |`,
	);
	console.log(
		"| After snapshot | Pending Manual Evidence | Rerun and attach `bun run inventory:validation-fixtures --mutation-snapshot` after browser actions. |",
	);
	console.log(
		"| Brain evidence update | Pending Manual Evidence | Update `brain/reports/2026-06-15-inventory-browser-validation-evidence.md` with final results, screenshots/notes, and snapshot comparisons. |",
	);
	console.log("");

	console.log("### Pending Phase Coverage");
	console.log("");
	console.log("| Phase | Runs | Status | Evidence Focus |");
	console.log("| --- | --- | --- | --- |");
	for (const phase of COMPLETION_GATE_PHASES) {
		const workflows = phase.runOrders.map((runOrder) =>
			workflowsByRun.get(runOrder),
		);
		const status = workflows.every((workflow) => workflow?.ready)
			? "Ready"
			: "Blocked";
		console.log(
			`| ${escapeMarkdownCell(phase.label)} | ${phase.runOrders.join(", ")} | ${status} | ${escapeMarkdownCell(phase.evidence)} |`,
		);
	}
	console.log("");

	console.log("### Browser Run Rows");
	console.log("");
	console.log(
		"| Run | Workflow | Status | Workspace | Use Sample | Compare Fields | Expected Delta |",
	);
	console.log("| ---: | --- | --- | --- | --- | --- | --- |");
	for (const workflow of report.workflowMatrix) {
		console.log(
			`| ${workflow.runOrder} | ${escapeMarkdownCell(workflow.label)} | ${
				workflow.ready ? "Ready" : "Blocked"
			} | \`${escapeMarkdownCell(workflow.workspaceHref)}\` | ${escapeMarkdownCell(
				formatWorkflowPrimarySample(workflow),
			)} | ${escapeMarkdownCell(
				compareFieldsForRunOrder(workflow.runOrder),
			)} | ${escapeMarkdownCell(
				expectedDeltaForRunOrder(workflow.runOrder),
			)} |`,
		);
	}
}

function printSeedChecklist(payload: {
	generatedAt: string;
	databaseUrl: string;
	report: Awaited<
		ReturnType<
			typeof import("../packages/inventory/src/inventory").inventoryBrowserValidationFixtureReport
		>
	>;
}) {
	const { report } = payload;

	console.log("Inventory validation fixture seed checklist");
	console.log(`generatedAt: ${payload.generatedAt}`);
	console.log(`database: ${payload.databaseUrl}`);
	console.log(
		`status: ${report.status} (${report.summary.readyFixtureCount}/${report.summary.requiredFixtureCount} ready, ${report.summary.missingFixtureCount} missing)`,
	);
	console.log("");

	if (!report.diagnostics.seedFixturesToPrepare.length) {
		console.log("All seed fixture groups are ready.");
		console.log(
			`Runnable browser checks: ${report.summary.readyWorkflowCount}/${report.summary.requiredWorkflowCount}.`,
		);
		console.log("Next: run the approved browser mutation matrix and record evidence.");
		return;
	}

	for (const seed of report.diagnostics.seedFixturesToPrepare) {
		const missingFixtures = report.fixtures.filter((fixture) =>
			seed.missingFixtureKeys.includes(fixture.key),
		);

		console.log(`${seed.seedFixtureId}`);
		console.log(`  plan: ${seed.seedPlanHref}`);
		console.log(`  missingCategories: ${seed.missingCount}`);
		for (const fixture of missingFixtures) {
			console.log(`  - ${fixture.label}`);
			console.log(`    workspace: ${fixture.workspaceHref}`);
			console.log(`    action: ${fixture.recommendedAction}`);
		}
		console.log("");
	}

	console.log("Safe sequence:");
	console.log("  1. Prepare the seed groups above in local or approved staging only.");
	console.log("  2. Rerun `bun run inventory:validation-fixtures --markdown`.");
	console.log("  3. Start browser mutation validation only after status is ready.");
}

const SEED_BLUEPRINTS: Record<
	string,
	{
		purpose: string;
		rows: string[];
		readinessPredicates: string[];
		rollback: string;
	}
> = {
	"INV-FIX-ALLOC": {
		purpose:
			"Create one disposable inventory-backed SALE order with component rows, three pending_review allocations for allocation-review workflows, two approved allocations for dispatch assignment capacity, two reserved allocations for pack/release capacity, and picked allocations for fulfill proof.",
		rows: [
			"InventoryCategory(productKind=inventory, stockMode=monitored, uid=inv-fix-alloc-category)",
			"Inventory(productKind=inventory, sourceCustom=false, stockMode=monitored, uid=inv-fix-alloc-item)",
			"InventoryVariant(uid=inv-fix-alloc-variant, inventoryId=<alloc item>)",
			"InventoryStock(inventoryVariantId=<alloc variant>, qty >= allocated proof qty)",
			"SalesOrders(orderId=INV-FIX-ALLOC, deletedAt=null)",
			"LineItem(lineItemType=SALE, saleId=<fixture sale>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"SubComponents(parentId=<alloc item>, inventoryCategoryId=<alloc category>, required=true)",
			"LineItemComponents(lineItemId=<fixture line>, subComponentId=<subcomponent>, inventoryVariantId=<alloc variant>, status!=cancelled)",
			"StockAllocation(status=pending_review, notes contains pending_review_approve, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"StockAllocation(status=pending_review, notes contains pending_review_reject, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"StockAllocation(status=pending_review, notes contains pending_review_bulk, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"StockAllocation(status=approved, notes contains dispatch_assign, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"StockAllocation(status=approved, notes contains dispatch_assign_spare, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"StockAllocation(status=reserved, notes contains dispatch_pack, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"StockAllocation(status=reserved, notes contains dispatch_release, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
			"StockAllocation(status=picked, lineItemComponentId=<component>, inventoryVariantId=<alloc variant>, deletedAt=null)",
		],
		readinessPredicates: [
			"pending_allocation_review: at least three StockAllocation.status=pending_review rows on non-deleted SALE lines with non-deleted sales",
			"dispatch_assignable_allocation: at least two StockAllocation.status=approved rows on non-deleted SALE lines with non-deleted sales",
			"dispatch_packable_allocation: at least two StockAllocation.status=reserved rows on non-deleted SALE lines with non-deleted sales",
			"dispatch_fulfillable_allocation: StockAllocation.status=picked on non-deleted SALE line with non-deleted sale",
		],
		rollback:
			"Delete or soft-delete allocations first, then line components, line item, fixture sale, stock, variant, item, and category tagged with INV-FIX-ALLOC.",
	},
	"INV-FIX-INBOUND": {
		purpose:
			"Create one disposable inventory-backed SALE order with open demand and a receiveable inbound shipment item.",
		rows: [
			"Supplier(uid=inv-fix-supplier)",
			"InventoryCategory(productKind=inventory, stockMode=monitored, uid=inv-fix-inbound-category)",
			"Inventory(productKind=inventory, sourceCustom=false, stockMode=monitored, uid=inv-fix-inbound-item)",
			"InventoryVariant(uid=inv-fix-inbound-variant, inventoryId=<inbound item>)",
			"SalesOrders(orderId=INV-FIX-INBOUND, deletedAt=null)",
			"LineItem(lineItemType=SALE, saleId=<fixture sale>, inventoryVariantId=<inbound variant>, deletedAt=null)",
			"SubComponents(parentId=<inbound item>, inventoryCategoryId=<inbound category>, required=true)",
			"LineItemComponents(lineItemId=<fixture line>, subComponentId=<subcomponent>, inventoryVariantId=<inbound variant>, status=inbound_required)",
			"InboundDemand(status=pending or ordered, qty > qtyReceived, lineItemComponentId=<component>, inventoryVariantId=<inbound variant>, deletedAt=null)",
			"InboundShipment(status=pending or in_progress, supplierId=<fixture supplier>, deletedAt=null)",
			"InboundShipmentItem(inboundId=<shipment>, inventoryVariantId=<inbound variant>, qty > 0, deletedAt=null)",
		],
		readinessPredicates: [
			"open_inbound_demand: InboundDemand.status in pending/ordered/partially_received on non-deleted SALE line with non-deleted sale",
			"inbound_receiving_shipment: InboundShipment.status in pending/in_progress/issue_open with at least one non-deleted item",
		],
		rollback:
			"Delete or soft-delete inbound demand and shipment items first, then shipment, line component, line item, fixture sale, variant, item, category, and supplier tagged with INV-FIX-INBOUND.",
	},
	"INV-FIX-RECEIVED": {
		purpose:
			"Create one disposable backordered SALE line with received inbound demand that has not yet been released to allocation.",
		rows: [
			"InventoryCategory(productKind=inventory, stockMode=monitored, uid=inv-fix-received-category)",
			"Inventory(productKind=inventory, sourceCustom=false, stockMode=monitored, uid=inv-fix-received-item)",
			"InventoryVariant(uid=inv-fix-received-variant, inventoryId=<received item>)",
			"SalesOrders(orderId=INV-FIX-RECEIVED, deletedAt=null)",
			"LineItem(lineItemType=SALE, saleId=<fixture sale>, inventoryVariantId=<received variant>, deletedAt=null)",
			"SubComponents(parentId=<received item>, inventoryCategoryId=<received category>, required=true)",
			"LineItemComponents(lineItemId=<fixture line>, subComponentId=<subcomponent>, inventoryVariantId=<received variant>, status=partially_received)",
			"InboundDemand(status=partially_received or received, qtyReceived > 0, lineItemComponentId=<component>, inventoryVariantId=<received variant>, deletedAt=null)",
		],
		readinessPredicates: [
			"received_inbound_backorder: InboundDemand.status in partially_received/received and qtyReceived > 0 on non-deleted SALE line with non-deleted sale",
		],
		rollback:
			"Delete or soft-delete inbound demand first, then component, line item, fixture sale, variant, item, and category tagged with INV-FIX-RECEIVED.",
	},
	"INV-FIX-PARTIAL": {
		purpose:
			"Create disposable SALE lines with available allocation and hold-until-complete metadata for partial shipment proof.",
		rows: [
			"InventoryCategory(productKind=inventory, stockMode=monitored, uid=inv-fix-partial-category)",
			"Inventory(productKind=inventory, sourceCustom=false, stockMode=monitored, uid=inv-fix-partial-item)",
			"InventoryVariant(uid=inv-fix-partial-variant, inventoryId=<partial item>)",
			"InventoryStock(inventoryVariantId=<partial variant>, qty > 0)",
			"SalesOrders(orderId=INV-FIX-PARTIAL, deletedAt=null)",
			"LineItem(meta.fulfillment.holdUntilComplete!=true, lineItemType=SALE, saleId=<fixture sale>, qty > allocated qty, inventoryVariantId=<partial variant>, deletedAt=null)",
			"LineItem(meta={ fulfillment: { holdUntilComplete: true } }, lineItemType=SALE, saleId=<fixture sale>, qty > allocated qty, inventoryVariantId=<partial variant>, deletedAt=null)",
			"SubComponents(parentId=<partial item>, inventoryCategoryId=<partial category>, required=true)",
			"LineItemComponents(lineItemId=<available line>, subComponentId=<subcomponent>, inventoryVariantId=<partial variant>, status!=cancelled)",
			"LineItemComponents(lineItemId=<held line>, subComponentId=<subcomponent>, inventoryVariantId=<partial variant>, status!=cancelled)",
			"StockAllocation(status=approved or reserved or picked, lineItemComponentId=<available component>, inventoryVariantId=<partial variant>, deletedAt=null)",
		],
		readinessPredicates: [
			"partial_shipment_available: non-held non-deleted SALE line with non-cancelled component and approved/reserved/picked allocation",
			"held_partial_shipment: recent non-deleted SALE line with non-cancelled component and meta.fulfillment.holdUntilComplete=true",
		],
		rollback:
			"Delete or soft-delete allocations first, then components, line items, fixture sale, stock, variant, item, and category tagged with INV-FIX-PARTIAL.",
	},
	"INV-FIX-STOCK-LOW": {
		purpose:
			"Create one monitored inventory variant whose summed stock quantity is at or below its low-stock threshold.",
		rows: [
			"InventoryCategory(productKind=inventory, stockMode=monitored, uid=inv-fix-stock-low-category)",
			"Inventory(productKind=inventory, sourceCustom=false, stockMode=monitored, uid=inv-fix-stock-low-item)",
			"InventoryVariant(uid=inv-fix-stock-low-variant, lowStockAlert=5, inventoryId=<low item>, deletedAt=null)",
			"InventoryStock(inventoryVariantId=<low variant>, qty=0..5, deletedAt=null)",
		],
		readinessPredicates: [
			"low_stock_variant: monitored, non-custom inventory variant with lowStockAlert set and summed stock qty <= lowStockAlert",
		],
		rollback:
			"Delete or soft-delete stock, variant, item, and category tagged with INV-FIX-STOCK-LOW.",
	},
	"INV-FIX-STOCK-SAFE": {
		purpose:
			"Create one monitored inventory variant reserved for manual stock add/remove/return/correction proof.",
		rows: [
			"InventoryCategory(productKind=inventory, stockMode=monitored, uid=inv-fix-stock-safe-category)",
			"Inventory(productKind=inventory, sourceCustom=false, stockMode=monitored, uid=inv-fix-stock-safe-item)",
			"InventoryVariant(uid=inv-fix-stock-safe-variant, inventoryId=<safe item>, deletedAt=null)",
			"InventoryStock(inventoryVariantId=<safe variant>, qty >= 5, deletedAt=null)",
		],
		readinessPredicates: [
			"safe_stock_adjustment_variant: monitored, non-custom inventory variant with at least one non-deleted positive-stock row; qty >= 5 is recommended for mutation proof",
		],
		rollback:
			"Delete or soft-delete stock, variant, item, and category tagged with INV-FIX-STOCK-SAFE.",
	},
};

function printSeedBlueprint(payload: {
	generatedAt: string;
	databaseUrl: string;
	report: Awaited<
		ReturnType<
			typeof import("../packages/inventory/src/inventory").inventoryBrowserValidationFixtureReport
		>
	>;
}) {
	const { report } = payload;
	const groups =
		report.diagnostics.seedFixturesToPrepare.length > 0
			? report.diagnostics.seedFixturesToPrepare
			: Object.keys(SEED_BLUEPRINTS).map((seedFixtureId) => ({
					seedFixtureId,
					seedPlanHref: SEED_BLUEPRINTS[seedFixtureId]?.purpose || "",
					missingCount: 0,
					missingFixtureKeys: [],
					missingFixtureLabels: [],
				}));

	console.log("Inventory validation fixture seed blueprint");
	console.log(`generatedAt: ${payload.generatedAt}`);
	console.log(`database: ${payload.databaseUrl}`);
	console.log(
		`status: ${report.status} (${report.summary.readyFixtureCount}/${report.summary.requiredFixtureCount} ready, ${report.summary.missingFixtureCount} missing)`,
	);
	console.log("mode: read-only blueprint, no data is written");
	console.log("");

	for (const group of groups) {
		const blueprint = SEED_BLUEPRINTS[group.seedFixtureId];
		if (!blueprint) continue;

		console.log(`${group.seedFixtureId}`);
		console.log(`  purpose: ${blueprint.purpose}`);
		console.log("  rows:");
		for (const row of blueprint.rows) {
			console.log(`    - ${row}`);
		}
		console.log("  readinessPredicates:");
		for (const predicate of blueprint.readinessPredicates) {
			console.log(`    - ${predicate}`);
		}
		console.log(`  rollback: ${blueprint.rollback}`);
		console.log("");
	}

	console.log("Next:");
	console.log("  1. Convert these row blueprints into a reviewed local/staging seed.");
	console.log("  2. Rerun `bun run inventory:validation-fixtures --markdown`.");
	console.log("  3. Only run browser mutation proof after the preflight reports ready.");
}

function printHumanReport(payload: {
	generatedAt: string;
	databaseUrl: string;
	report: Awaited<
		ReturnType<
			typeof import("../packages/inventory/src/inventory").inventoryBrowserValidationFixtureReport
		>
	>;
}) {
	const { report } = payload;

	console.log("Inventory browser validation fixture preflight");
	console.log(`generatedAt: ${payload.generatedAt}`);
	console.log(`database: ${payload.databaseUrl}`);
	console.log(
		`status: ${report.status} (${report.summary.readyFixtureCount}/${report.summary.requiredFixtureCount} ready, ${report.summary.missingFixtureCount} missing)`,
	);
	console.log(`nextAction: ${report.nextAction}`);
	console.log(
		`workflowMatrix: ${report.summary.readyWorkflowCount}/${report.summary.requiredWorkflowCount} runnable, ${report.summary.blockedWorkflowCount} blocked`,
	);
	if (report.diagnostics.seedFixturesToPrepare.length) {
		console.log(
			`seedFixturesToPrepare: ${report.diagnostics.seedFixturesToPrepare
				.map(
					(seed) =>
						`${seed.seedFixtureId}(${seed.missingCount}: ${seed.missingFixtureLabels.join(", ")})`,
				)
				.join("; ")}`,
		);
	}
	console.log("");

	for (const fixture of report.fixtures) {
		const marker = fixture.ready ? "ready" : "missing";
		console.log(
			`- ${fixture.label}: ${marker} (${fixture.count}/${fixture.requiredCount})`,
		);
		console.log(`  seed: ${fixture.seedFixtureId}`);
		console.log(`  plan: ${fixture.seedPlanHref}`);
		console.log(`  workspace: ${fixture.workspaceHref}`);
		console.log(`  action: ${fixture.recommendedAction}`);
		if (!fixture.countDiagnostic.complete) {
			const details = [
				fixture.countDiagnostic.scanLimit != null
					? `scanLimit=${fixture.countDiagnostic.scanLimit}`
					: null,
				fixture.countDiagnostic.scannedCount != null
					? `scanned=${fixture.countDiagnostic.scannedCount}`
					: null,
				fixture.countDiagnostic.candidateCount != null
					? `candidates=${fixture.countDiagnostic.candidateCount}`
					: null,
			].filter(Boolean);
			console.log(
				`  count: incomplete ${details.length ? `(${details.join(", ")})` : ""}`,
			);
			if (fixture.countDiagnostic.note) {
				console.log(`  note: ${fixture.countDiagnostic.note}`);
			}
		}
		for (const sample of fixture.samples) {
			console.log(`  sample: ${formatSample(sample)}`);
		}
	}

	console.log("");
	console.log("Browser mutation matrix:");
	for (const workflow of report.workflowMatrix) {
		const marker = workflow.ready ? "runnable" : "blocked";
		console.log(`- ${workflow.label}: ${marker}`);
		console.log(`  phase: ${workflow.phase}`);
		console.log(`  workspace: ${workflow.workspaceHref}`);
		console.log(`  fixtures: ${workflow.fixtureKeys.join(", ")}`);
		if (workflow.missingFixtureKeys.length) {
			console.log(`  missing: ${workflow.missingFixtureKeys.join(", ")}`);
		}
		console.log(`  action: ${workflow.operatorAction}`);
		console.log(`  guard: ${workflow.operatorGuard}`);
		console.log(`  evidence: ${workflow.expectedEvidence}`);
		if (workflow.primarySample) {
			console.log(`  useSample: ${formatSample(workflow.primarySample)}`);
		}
	}
}

type MutationSnapshot = Awaited<ReturnType<typeof buildMutationSnapshot>>;

async function buildMutationSnapshot(
	db: typeof import("../packages/db/src/index.ts").db,
) {
	const fixtureOrderIds = [
		"INV-FIX-ALLOC",
		"INV-FIX-INBOUND",
		"INV-FIX-RECEIVED",
		"INV-FIX-PARTIAL",
	];
	const fixtureSkus = [
		"INV-FIX-ALLOC",
		"INV-FIX-INBOUND",
		"INV-FIX-RECEIVED",
		"INV-FIX-PARTIAL",
		"INV-FIX-STOCK-LOW",
		"INV-FIX-STOCK-SAFE",
	];

	const sales = await db.salesOrders.findMany({
		where: {
			orderId: {
				in: fixtureOrderIds,
			},
		},
		select: {
			id: true,
			orderId: true,
			status: true,
			inventoryStatus: true,
		},
		orderBy: {
			id: "asc",
		},
	});
	const saleIds = sales.map((sale) => sale.id);

	const allocations = await db.stockAllocation.findMany({
		where: {
			OR: [
				{
					notes: {
						startsWith: "INV-FIX-ALLOC ",
					},
				},
				{
					notes: {
						startsWith: "INV-FIX-PARTIAL ",
					},
				},
			],
		},
		select: {
			id: true,
			status: true,
			qty: true,
			notes: true,
			inventoryStockId: true,
			deletedAt: true,
			updatedAt: true,
			inventoryVariant: {
				select: {
					sku: true,
				},
			},
			lineItemComponent: {
				select: {
					id: true,
					status: true,
					qty: true,
					qtyAllocated: true,
					qtyInbound: true,
					qtyReceived: true,
					parent: {
						select: {
							id: true,
							uid: true,
							qty: true,
							meta: true,
							sale: {
								select: {
									id: true,
									orderId: true,
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			id: "asc",
		},
	});

	const inboundShipments = await db.inboundShipment.findMany({
		where: {
			reference: {
				in: ["INV-FIX-INBOUND-SHIPMENT", "INV-FIX-RECEIVED-SHIPMENT"],
			},
		},
		select: {
			id: true,
			reference: true,
			status: true,
			progress: true,
			receivedAt: true,
			deletedAt: true,
			items: {
				select: {
					id: true,
					qty: true,
					qtyGood: true,
					qtyIssue: true,
					updatedAt: true,
					inventoryVariant: {
						select: {
							sku: true,
						},
					},
					stockMovement: {
						select: {
							id: true,
							type: true,
							changeQty: true,
							currentQty: true,
							createdAt: true,
						},
						orderBy: {
							id: "asc",
						},
					},
					inboundDemands: {
						select: {
							id: true,
							status: true,
							qty: true,
							qtyReceived: true,
							notes: true,
							updatedAt: true,
							lineItemComponent: {
								select: {
									parent: {
										select: {
											sale: {
												select: {
													id: true,
													orderId: true,
												},
											},
										},
									},
								},
							},
						},
						orderBy: {
							id: "asc",
						},
					},
				},
				orderBy: {
					id: "asc",
				},
			},
		},
		orderBy: {
			id: "asc",
		},
	});

	const variants = await db.inventoryVariant.findMany({
		where: {
			sku: {
				in: fixtureSkus,
			},
		},
		select: {
			id: true,
			sku: true,
			lowStockAlert: true,
			deletedAt: true,
			inventory: {
				select: {
					id: true,
					name: true,
				},
			},
			stocks: {
				select: {
					id: true,
					qty: true,
					location: true,
					deletedAt: true,
					updatedAt: true,
				},
				orderBy: {
					id: "asc",
				},
			},
			stockMovements: {
				select: {
					id: true,
					type: true,
					changeQty: true,
					currentQty: true,
					reference: true,
					notes: true,
					createdAt: true,
				},
				orderBy: {
					id: "desc",
				},
				take: 5,
			},
		},
		orderBy: {
			id: "asc",
		},
	});

	const lineItems = await db.lineItem.findMany({
		where: {
			saleId: {
				in: saleIds.length ? saleIds : [-1],
			},
		},
		select: {
			id: true,
			uid: true,
			title: true,
			qty: true,
			meta: true,
			sale: {
				select: {
					id: true,
					orderId: true,
				},
			},
			components: {
				select: {
					id: true,
					status: true,
					qty: true,
					qtyAllocated: true,
					qtyInbound: true,
					qtyReceived: true,
					stockAllocations: {
						select: {
							id: true,
							status: true,
							qty: true,
						},
						orderBy: {
							id: "asc",
						},
					},
					inboundDemands: {
						select: {
							id: true,
							status: true,
							qty: true,
							qtyReceived: true,
						},
						orderBy: {
							id: "asc",
						},
					},
				},
				orderBy: {
					id: "asc",
				},
			},
		},
		orderBy: {
			id: "asc",
		},
	});

	const deliveries = saleIds.length
		? await db.orderDelivery.findMany({
				where: {
					salesOrderId: {
						in: saleIds,
					},
				},
				select: {
					id: true,
					salesOrderId: true,
					status: true,
					deliveryMode: true,
					meta: true,
					updatedAt: true,
					items: {
						select: {
							id: true,
							orderId: true,
							orderItemId: true,
							qty: true,
							status: true,
							packingStatus: true,
							meta: true,
						},
						orderBy: {
							id: "asc",
						},
					},
				},
				orderBy: {
					id: "asc",
				},
			})
		: [];

	return {
		sales,
		allocations,
		inboundShipments,
		variants,
		lineItems,
		deliveries,
	};
}

function valueToString(value: unknown) {
	if (value == null) return "";
	if (value instanceof Date) return value.toISOString();
	if (typeof value == "object") return JSON.stringify(value);
	return String(value);
}

function printRows(
	title: string,
	headers: string[],
	rows: Array<Record<string, unknown>>,
) {
	console.log(`### ${title}`);
	console.log("");
	if (!rows.length) {
		console.log("_No rows found._");
		console.log("");
		return;
	}
	console.log(`| ${headers.join(" | ")} |`);
	console.log(`| ${headers.map(() => "---").join(" | ")} |`);
	for (const row of rows) {
		console.log(
			`| ${headers
				.map((header) => escapeMarkdownCell(valueToString(row[header])))
				.join(" | ")} |`,
		);
	}
	console.log("");
}

function allocationProofRole(notes?: string | null) {
	if (!notes) return "";
	const roles: Array<[string, string]> = [
		["pending_review_approve", "allocation_approve"],
		["pending_review_reject", "allocation_reject"],
		["pending_review_bulk", "allocation_bulk_approve"],
		["dispatch_assign_spare", "dispatch_assign_spare"],
		["dispatch_assign", "dispatch_assign"],
		["dispatch_pack_release", "legacy_pack_release"],
		["dispatch_pack", "dispatch_pack"],
		["dispatch_release", "dispatch_release"],
		["dispatch_fulfill", "dispatch_fulfill"],
		["inv-fix-partial-available-line", "partial_ship_available"],
		["inv-fix-partial-held-line", "partial_hold_until_complete"],
		["pending_review validation fixture allocation", "legacy_pending_review"],
		["approved validation fixture allocation", "legacy_approved"],
		["reserved validation fixture allocation", "legacy_reserved"],
		["picked validation fixture allocation", "legacy_picked"],
	];

	return roles.find(([needle]) => notes.includes(needle))?.[1] ?? "";
}

type BrowserProofTarget = {
	runOrder: number;
	label: string;
	primary: boolean;
};

const PROOF_TARGETS_BY_ROLE: Record<string, BrowserProofTarget> = {
	allocation_approve: {
		runOrder: 10,
		label: "Allocation approve",
		primary: true,
	},
	allocation_reject: {
		runOrder: 20,
		label: "Allocation reject",
		primary: true,
	},
	allocation_bulk_approve: {
		runOrder: 30,
		label: "Bulk allocation approve",
		primary: true,
	},
	dispatch_assign_spare: {
		runOrder: 40,
		label: "Dispatch assign",
		primary: true,
	},
	dispatch_assign: {
		runOrder: 40,
		label: "Dispatch assign alternate",
		primary: false,
	},
	dispatch_pack: {
		runOrder: 50,
		label: "Dispatch pack",
		primary: true,
	},
	dispatch_fulfill: {
		runOrder: 60,
		label: "Dispatch fulfill",
		primary: true,
	},
	dispatch_release: {
		runOrder: 70,
		label: "Dispatch release",
		primary: true,
	},
	partial_ship_available: {
		runOrder: 100,
		label: "Ship available partial line",
		primary: true,
	},
	partial_hold_until_complete: {
		runOrder: 110,
		label: "Hold partial line",
		primary: true,
	},
	legacy_pending_review: {
		runOrder: 10,
		label: "Legacy pending allocation candidate",
		primary: false,
	},
	legacy_approved: {
		runOrder: 40,
		label: "Legacy dispatch assign candidate",
		primary: false,
	},
	legacy_reserved: {
		runOrder: 50,
		label: "Legacy dispatch pack/release candidate",
		primary: false,
	},
	legacy_picked: {
		runOrder: 60,
		label: "Legacy dispatch fulfill candidate",
		primary: false,
	},
	legacy_pack_release: {
		runOrder: 50,
		label: "Legacy dispatch pack/release candidate",
		primary: false,
	},
};

function formatProofTarget(target?: BrowserProofTarget | null) {
	if (!target) return "";
	return `Run ${target.runOrder} ${target.label}`;
}

function primaryProofMarker(target?: BrowserProofTarget | null) {
	return target?.primary ? "yes" : "";
}

function allocationProofTarget(role: string) {
	return PROOF_TARGETS_BY_ROLE[role] ?? null;
}

function inboundShipmentProofRole(input: {
	reference?: string | null;
	sku?: string | null;
}) {
	if (
		input.reference == "INV-FIX-INBOUND-SHIPMENT" ||
		input.sku == "INV-FIX-INBOUND"
	) {
		return "inbound_receive";
	}
	if (
		input.reference == "INV-FIX-RECEIVED-SHIPMENT" ||
		input.sku == "INV-FIX-RECEIVED"
	) {
		return "received_backorder_source";
	}
	return "";
}

function proofTargetForInboundShipmentItem(input: {
	reference?: string | null;
	sku?: string | null;
}) {
	if (
		input.reference == "INV-FIX-INBOUND-SHIPMENT" ||
		input.sku == "INV-FIX-INBOUND"
	) {
		return {
			runOrder: 80,
			label: "Receive inbound shipment",
			primary: true,
		};
	}
	if (
		input.reference == "INV-FIX-RECEIVED-SHIPMENT" ||
		input.sku == "INV-FIX-RECEIVED"
	) {
		return {
			runOrder: 90,
			label: "Release received backorder source",
			primary: false,
		};
	}
	return null;
}

function proofTargetForInboundDemand(input: {
	orderId?: string | null;
	shipmentReference?: string | null;
	notes?: string | null;
}) {
	if (
		input.orderId == "INV-FIX-INBOUND" ||
		input.shipmentReference == "INV-FIX-INBOUND-SHIPMENT" ||
		input.notes?.includes("INV-FIX-INBOUND")
	) {
		return {
			runOrder: 80,
			label: "Receive inbound shipment",
			primary: true,
		};
	}
	if (
		input.orderId == "INV-FIX-RECEIVED" ||
		input.shipmentReference == "INV-FIX-RECEIVED-SHIPMENT" ||
		input.notes?.includes("INV-FIX-RECEIVED")
	) {
		return {
			runOrder: 90,
			label: "Release received backorder",
			primary: true,
		};
	}
	return null;
}

function inboundDemandProofRole(input: {
	orderId?: string | null;
	shipmentReference?: string | null;
	notes?: string | null;
}) {
	if (
		input.orderId == "INV-FIX-INBOUND" ||
		input.shipmentReference == "INV-FIX-INBOUND-SHIPMENT" ||
		input.notes?.includes("INV-FIX-INBOUND")
	) {
		return "inbound_receive";
	}
	if (
		input.orderId == "INV-FIX-RECEIVED" ||
		input.shipmentReference == "INV-FIX-RECEIVED-SHIPMENT" ||
		input.notes?.includes("INV-FIX-RECEIVED")
	) {
		return "received_backorder_release";
	}
	return "";
}

function proofTargetForLine(input: { orderId?: string | null; uid?: string | null }) {
	if (input.uid == "inv-fix-partial-available-line") {
		return {
			runOrder: 100,
			label: "Ship available partial line",
			primary: true,
		};
	}
	if (input.uid == "inv-fix-partial-held-line") {
		return {
			runOrder: 110,
			label: "Hold partial line",
			primary: true,
		};
	}
	if (input.orderId == "INV-FIX-INBOUND") {
		return {
			runOrder: 80,
			label: "Receive inbound shipment",
			primary: true,
		};
	}
	if (input.orderId == "INV-FIX-RECEIVED") {
		return {
			runOrder: 90,
			label: "Release received backorder",
			primary: true,
		};
	}
	if (input.orderId == "INV-FIX-ALLOC") {
		return {
			runOrder: 10,
			label: "Allocation/dispatch fixture",
			primary: false,
		};
	}
	return null;
}

function proofTargetForVariantSku(sku?: string | null) {
	if (sku == "INV-FIX-STOCK-SAFE") {
		return {
			runOrder: 120,
			label: "Stock adjustment",
			primary: true,
		};
	}
	if (sku == "INV-FIX-STOCK-LOW") {
		return {
			runOrder: 130,
			label: "Low-stock dashboard",
			primary: true,
		};
	}
	if (sku == "INV-FIX-INBOUND") {
		return {
			runOrder: 80,
			label: "Receive inbound shipment",
			primary: true,
		};
	}
	if (sku == "INV-FIX-RECEIVED") {
		return {
			runOrder: 90,
			label: "Release received backorder",
			primary: true,
		};
	}
	if (sku == "INV-FIX-PARTIAL") {
		return {
			runOrder: 100,
			label: "Partial shipment fixture",
			primary: false,
		};
	}
	if (sku == "INV-FIX-ALLOC") {
		return {
			runOrder: 10,
			label: "Allocation/dispatch fixture",
			primary: false,
		};
	}
	return null;
}

function proofTargetForOrderId(orderId?: string | null) {
	if (orderId == "INV-FIX-ALLOC") {
		return {
			runOrder: 60,
			label: "Dispatch fulfillment compatibility rows",
			primary: true,
		};
	}
	if (orderId == "INV-FIX-PARTIAL") {
		return {
			runOrder: 100,
			label: "Partial shipment compatibility rows",
			primary: true,
		};
	}
	return null;
}

const PRIMARY_PROOF_WORKFLOWS = [
	{
		runOrder: 10,
		label: "Approve pending allocation",
		compareFields: "allocation.status; component allocation fields",
		expectedDelta: "allocation#7 leaves pending_review for approved/reserved",
	},
	{
		runOrder: 20,
		label: "Reject pending allocation",
		compareFields: "allocation.status/deletedAt; component allocation fields",
		expectedDelta: "allocation#8 is rejected/released and stays non-dispatchable",
	},
	{
		runOrder: 30,
		label: "Bulk approve visible allocations",
		compareFields: "allocation.status; bulk skipped/approved result notes",
		expectedDelta: "allocation#9 is approved while already-handled rows are skipped",
	},
	{
		runOrder: 40,
		label: "Assign dispatch allocation",
		compareFields: "allocation.status approved->reserved",
		expectedDelta: "allocation#13 changes from approved to reserved",
	},
	{
		runOrder: 50,
		label: "Pack reserved allocation",
		compareFields: "allocation.status reserved->picked",
		expectedDelta: "allocation#14 changes from reserved to picked",
	},
	{
		runOrder: 60,
		label: "Fulfill picked allocation",
		compareFields: "allocation.status picked->consumed; delivery rows; line allocation ids",
		expectedDelta:
			"allocation#12 changes from picked to consumed and delivery rows appear",
	},
	{
		runOrder: 70,
		label: "Release reserved allocation",
		compareFields: "allocation.status reserved->released; stock availability",
		expectedDelta: "allocation#15 changes from reserved to released",
	},
	{
		runOrder: 80,
		label: "Receive inbound shipment",
		compareFields:
			"shipment status; item qtyGood/qtyIssue; demand.qtyReceived/status; stock rows/movements",
		expectedDelta:
			"shipment item#1 good/issue totals increase and demand#1 received/status updates by delta only",
	},
	{
		runOrder: 90,
		label: "Release received backorder",
		compareFields: "demand.status/qtyReceived; allocation ids; line component status",
		expectedDelta:
			"demand#2 received quantity is allocated/released and line component moves toward ready/allocated",
	},
	{
		runOrder: 100,
		label: "Ship available partial line",
		compareFields: "allocation status; delivery rows; line remainder/backorder evidence",
		expectedDelta:
			"line#23 ships available quantity without consuming held line#24",
	},
	{
		runOrder: 110,
		label: "Hold partial line until complete",
		compareFields: "line holdUntilComplete; allocation remains unconsumed",
		expectedDelta: "line#24 remains held and allocation#6 remains unconsumed",
	},
	{
		runOrder: 120,
		label: "Post stock adjustment",
		compareFields: "stockRows qty; recentMovementIds type/change/current",
		expectedDelta:
			"variant#2066 stock and recent movement rows reflect signed adjustment actions",
	},
	{
		runOrder: 130,
		label: "Verify low-stock dashboard signal",
		compareFields: "stockRows qty vs lowStockAlert; no mutation expected",
		expectedDelta: "variant#2065 remains below low-stock threshold; no data mutation expected",
	},
];

function compareFieldsForRunOrder(runOrder: number) {
	return (
		PRIMARY_PROOF_WORKFLOWS.find((workflow) => workflow.runOrder == runOrder)
			?.compareFields ?? ""
	);
}

function expectedDeltaForRunOrder(runOrder: number) {
	return (
		PRIMARY_PROOF_WORKFLOWS.find((workflow) => workflow.runOrder == runOrder)
			?.expectedDelta ?? ""
	);
}

function collectPrimaryProofTargetIndex(snapshot: MutationSnapshot) {
	const rowsByRun = new Map<number, string[]>();
	const addRow = (target: BrowserProofTarget | null, row: string) => {
		if (!target?.primary) return;
		const rows = rowsByRun.get(target.runOrder) ?? [];
		rows.push(row);
		rowsByRun.set(target.runOrder, rows);
	};

	for (const allocation of snapshot.allocations) {
		const proofRole = allocationProofRole(allocation.notes);
		const proofTarget = allocationProofTarget(proofRole);
		addRow(
			proofTarget,
			[
				`allocation#${allocation.id}`,
				`status=${allocation.status}`,
				`order=${allocation.lineItemComponent.parent.sale?.orderId ?? ""}`,
				`line=${allocation.lineItemComponent.parent.id}`,
				`component=${allocation.lineItemComponent.id}`,
			].join(" "),
		);
	}

	for (const shipment of snapshot.inboundShipments) {
		for (const item of shipment.items) {
			const shipmentTarget = proofTargetForInboundShipmentItem({
				reference: shipment.reference,
				sku: item.inventoryVariant.sku,
			});
			addRow(
				shipmentTarget,
				[
					`shipmentItem#${item.id}`,
					`shipment=${shipment.id}`,
					`status=${shipment.status}`,
					`sku=${item.inventoryVariant.sku ?? ""}`,
					`good=${item.qtyGood}`,
					`issue=${item.qtyIssue}`,
				].join(" "),
			);

			for (const demand of item.inboundDemands) {
				const orderId = demand.lineItemComponent.parent.sale?.orderId;
				const demandTarget = proofTargetForInboundDemand({
					orderId,
					shipmentReference: shipment.reference,
					notes: demand.notes,
				});
				addRow(
					demandTarget,
					[
						`demand#${demand.id}`,
						`status=${demand.status}`,
						`order=${orderId ?? ""}`,
						`received=${demand.qtyReceived}`,
					].join(" "),
				);
			}
		}
	}

	for (const line of snapshot.lineItems) {
		const lineTarget = proofTargetForLine({
			orderId: line.sale?.orderId,
			uid: line.uid,
		});
		addRow(
			lineTarget,
			[
				`line#${line.id}`,
				`order=${line.sale?.orderId ?? ""}`,
				`uid=${line.uid}`,
				`qty=${line.qty}`,
			].join(" "),
		);
	}

	for (const variant of snapshot.variants) {
		const variantTarget = proofTargetForVariantSku(variant.sku);
		addRow(
			variantTarget,
			[
				`variant#${variant.id}`,
				`sku=${variant.sku ?? ""}`,
				`stock=${variant.stocks.map((stock) => `${stock.id}:${stock.qty}`).join(",")}`,
			].join(" "),
		);
	}

	for (const delivery of snapshot.deliveries) {
		const orderId = snapshot.sales.find(
			(sale) => sale.id == delivery.salesOrderId,
		)?.orderId;
		const deliveryTarget = proofTargetForOrderId(orderId);
		addRow(
			deliveryTarget,
			[
				`delivery#${delivery.id}`,
				`order=${orderId ?? ""}`,
				`status=${delivery.status}`,
				`items=${delivery.items.length}`,
			].join(" "),
		);
	}

	return PRIMARY_PROOF_WORKFLOWS.map((workflow) => {
		const rows = rowsByRun.get(workflow.runOrder) ?? [];
		return {
			run: workflow.runOrder,
			workflow: workflow.label,
			status: rows.length ? "ready" : "missing",
			compareFields: workflow.compareFields,
			expectedDelta: workflow.expectedDelta,
			primaryRows: rows.join("; "),
		};
	});
}

function printMutationSnapshot(payload: {
	generatedAt: string;
	databaseUrl: string;
	snapshot: MutationSnapshot;
}) {
	const { snapshot } = payload;

	console.log("## Inventory Browser Mutation State Snapshot");
	console.log("");
	console.log(`- Generated: ${payload.generatedAt}`);
	console.log(`- Database: \`${payload.databaseUrl}\``);
	console.log(
		"- Purpose: capture exact fixture row state before or after mutating browser validation.",
	);
	console.log(
		"- Compare: use the Primary Proof Target Index for run-by-run before/after review, then use the detail tables for field-level evidence.",
	);
	console.log("");

	printRows(
		"Primary Proof Target Index",
		[
			"run",
			"workflow",
			"status",
			"compareFields",
			"expectedDelta",
			"primaryRows",
		],
		collectPrimaryProofTargetIndex(snapshot),
	);

	printRows(
		"Sales",
		["id", "orderId", "status", "inventoryStatus"],
		snapshot.sales,
	);

	printRows(
		"Stock Allocations",
		[
			"id",
			"orderId",
			"lineItemId",
			"componentId",
			"sku",
			"status",
			"qty",
			"proofRole",
			"proofTarget",
			"primaryProof",
			"componentStatus",
			"componentAllocated",
			"componentInbound",
			"componentReceived",
			"stockId",
			"deletedAt",
			"notes",
		],
		snapshot.allocations.map((allocation) => {
			const proofRole = allocationProofRole(allocation.notes);
			const proofTarget = allocationProofTarget(proofRole);
			return {
				id: allocation.id,
				orderId: allocation.lineItemComponent.parent.sale?.orderId,
				lineItemId: allocation.lineItemComponent.parent.id,
				componentId: allocation.lineItemComponent.id,
				sku: allocation.inventoryVariant.sku,
				status: allocation.status,
				qty: allocation.qty,
				proofRole,
				proofTarget: formatProofTarget(proofTarget),
				primaryProof: primaryProofMarker(proofTarget),
				componentStatus: allocation.lineItemComponent.status,
				componentAllocated: allocation.lineItemComponent.qtyAllocated,
				componentInbound: allocation.lineItemComponent.qtyInbound,
				componentReceived: allocation.lineItemComponent.qtyReceived,
				stockId: allocation.inventoryStockId,
				deletedAt: allocation.deletedAt,
				notes: allocation.notes,
			};
		}),
	);

	printRows(
		"Inbound Shipment Items",
		[
			"shipmentId",
			"reference",
			"shipmentStatus",
			"itemId",
			"sku",
			"proofRole",
			"proofTarget",
			"primaryProof",
			"qty",
			"qtyGood",
			"qtyIssue",
			"movementCount",
			"demandIds",
		],
		snapshot.inboundShipments.flatMap((shipment) =>
			shipment.items.map((item) => {
				const proofInput = {
					reference: shipment.reference,
					sku: item.inventoryVariant.sku,
				};
				const proofRole = inboundShipmentProofRole(proofInput);
				const proofTarget = proofTargetForInboundShipmentItem(proofInput);
				return {
					shipmentId: shipment.id,
					reference: shipment.reference,
					shipmentStatus: shipment.status,
					itemId: item.id,
					sku: item.inventoryVariant.sku,
					proofRole,
					proofTarget: formatProofTarget(proofTarget),
					primaryProof: primaryProofMarker(proofTarget),
					qty: item.qty,
					qtyGood: item.qtyGood,
					qtyIssue: item.qtyIssue,
					movementCount: item.stockMovement.length,
					demandIds: item.inboundDemands.map((demand) => demand.id).join(","),
				};
			}),
		),
	);

	printRows(
		"Inbound Demands",
		[
			"id",
			"orderId",
			"status",
			"proofRole",
			"proofTarget",
			"primaryProof",
			"qty",
			"qtyReceived",
			"shipmentReference",
			"notes",
		],
		snapshot.inboundShipments.flatMap((shipment) =>
			shipment.items.flatMap((item) =>
				item.inboundDemands.map((demand) => {
					const orderId = demand.lineItemComponent.parent.sale?.orderId;
					const proofInput = {
						orderId,
						shipmentReference: shipment.reference,
						notes: demand.notes,
					};
					const proofRole = inboundDemandProofRole(proofInput);
					const proofTarget = proofTargetForInboundDemand(proofInput);
					return {
						id: demand.id,
						orderId,
						status: demand.status,
						proofRole,
						proofTarget: formatProofTarget(proofTarget),
						primaryProof: primaryProofMarker(proofTarget),
						qty: demand.qty,
						qtyReceived: demand.qtyReceived,
						shipmentReference: shipment.reference,
						notes: demand.notes,
					};
				}),
			),
		),
	);

	printRows(
		"Line Projections",
		[
			"id",
			"orderId",
			"uid",
			"proofTarget",
			"primaryProof",
			"qty",
			"holdUntilComplete",
			"componentIds",
			"componentStatuses",
			"allocationIds",
			"demandIds",
		],
		snapshot.lineItems.map((line) => {
			const proofTarget = proofTargetForLine({
				orderId: line.sale?.orderId,
				uid: line.uid,
			});
			return {
				id: line.id,
				orderId: line.sale?.orderId,
				uid: line.uid,
				proofTarget: formatProofTarget(proofTarget),
				primaryProof: primaryProofMarker(proofTarget),
				qty: line.qty,
				holdUntilComplete:
					typeof line.meta == "object" &&
					line.meta &&
					"fulfillment" in line.meta &&
					typeof line.meta.fulfillment == "object" &&
					line.meta.fulfillment &&
					"holdUntilComplete" in line.meta.fulfillment
						? line.meta.fulfillment.holdUntilComplete
						: "",
				componentIds: line.components.map((component) => component.id).join(","),
				componentStatuses: line.components
					.map((component) => `${component.id}:${component.status}`)
					.join(","),
				allocationIds: line.components
					.flatMap((component) =>
						component.stockAllocations.map(
							(allocation) => `${allocation.id}:${allocation.status}`,
						),
					)
					.join(","),
				demandIds: line.components
					.flatMap((component) =>
						component.inboundDemands.map(
							(demand) => `${demand.id}:${demand.status}:${demand.qtyReceived}`,
						),
					)
					.join(","),
			};
		}),
	);

	printRows(
		"Stock Fixtures",
		[
			"variantId",
			"sku",
			"item",
			"proofTarget",
			"primaryProof",
			"lowStockAlert",
			"stockRows",
			"recentMovementIds",
		],
		snapshot.variants.map((variant) => {
			const proofTarget = proofTargetForVariantSku(variant.sku);
			return {
				variantId: variant.id,
				sku: variant.sku,
				item: variant.inventory.name,
				proofTarget: formatProofTarget(proofTarget),
				primaryProof: primaryProofMarker(proofTarget),
				lowStockAlert: variant.lowStockAlert,
				stockRows: variant.stocks
					.map((stock) => `${stock.id}:${stock.qty}:${stock.location}`)
					.join(","),
				recentMovementIds: variant.stockMovements
					.map(
						(movement) =>
							`${movement.id}:${movement.type}:${movement.changeQty}:${movement.currentQty}`,
					)
					.join(","),
			};
		}),
	);

	printRows(
		"Delivery Compatibility Rows",
		[
			"id",
			"salesOrderId",
			"orderId",
			"proofTarget",
			"primaryProof",
			"status",
			"deliveryMode",
			"itemIds",
		],
		snapshot.deliveries.map((delivery) => {
			const orderId = snapshot.sales.find(
				(sale) => sale.id == delivery.salesOrderId,
			)?.orderId;
			const proofTarget = proofTargetForOrderId(orderId);
			return {
				id: delivery.id,
				salesOrderId: delivery.salesOrderId,
				orderId,
				proofTarget: formatProofTarget(proofTarget),
				primaryProof: primaryProofMarker(proofTarget),
				status: delivery.status,
				deliveryMode: delivery.deliveryMode,
				itemIds: delivery.items
					.map(
						(item) =>
							`${item.id}:${item.qty}:${item.status || item.packingStatus || ""}`,
					)
					.join(","),
			};
		}),
	);
}

async function assertDatabaseReachable(
	db: typeof import("../packages/db/src/index.ts").db,
	databaseUrl: string,
) {
	try {
		await db.$queryRawUnsafe("SELECT 1");
	} catch {
		throw new Error(
			`Cannot reach the configured database (${databaseUrl}). Start the local DB or pass DATABASE_URL for the target environment, then rerun this read-only preflight.`,
		);
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;

	const [{ db }, { inventoryBrowserValidationFixtureReport }] = await Promise.all([
		import("../packages/db/src/index.ts"),
		import("../packages/inventory/src/inventory.ts"),
	]);

	try {
		const databaseUrl = redactDatabaseUrl(process.env.DATABASE_URL);
		await assertDatabaseReachable(db, databaseUrl);
		const report = await inventoryBrowserValidationFixtureReport(db);
		const payload = {
			generatedAt: new Date().toISOString(),
			databaseUrl,
			report,
		};

		if (options.json) {
			console.log(JSON.stringify(payload, null, 2));
		} else if (options.markdown) {
			printMarkdownReport(payload);
		} else if (options.seedChecklist) {
			printSeedChecklist(payload);
		} else if (options.seedBlueprint) {
			printSeedBlueprint(payload);
		} else if (options.evidenceTemplate) {
			printEvidenceTemplate(payload);
		} else if (options.mutationSnapshot) {
			const snapshot = await buildMutationSnapshot(db);
			printMutationSnapshot({
				generatedAt: payload.generatedAt,
				databaseUrl,
				snapshot,
			});
		} else if (options.completionGate) {
			printCompletionGate(payload);
		} else {
			printHumanReport(payload);
		}

		if (options.failOnBlocked && report.status == "blocked") {
			process.exitCode = 1;
		}
	} finally {
		await db.$disconnect();
	}
}

main().catch((error) => {
	console.error(
		`[inventory-validation-fixture-report] ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	if (error instanceof UsageError) usage();
	process.exit(1);
});
