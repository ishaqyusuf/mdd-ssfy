import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

function assertContains(source: string, search: string) {
	assert.ok(source.includes(search), `Expected source to contain: ${search}`);
}

function assertNotContains(source: string, search: string) {
	assert.ok(
		!source.includes(search),
		`Expected source not to contain: ${search}`,
	);
}

describe("New Job install task table migration parity", () => {
	it("keeps the new job modal full screen through the small breakpoint", () => {
		const source = readSource("components/modals/new-job/index.tsx");

		assertContains(source, "h-[100dvh]");
		assertContains(source, "w-screen");
		assertContains(source, "max-w-none");
		assertContains(source, "md:h-auto");
		assertContains(source, "md:max-w-xl");
		assertContains(source, "max-h-none min-h-0");
		assertContains(source, "md:max-h-[60vh]");
	});

	it("keeps the final job form contained and usable on extra-small screens", () => {
		const modalSource = readSource("components/modals/new-job/index.tsx");
		const formSource = readSource("components/modals/new-job/form-step.tsx");
		const footerSource = readSource(
			"components/modals/new-job/new-job-footer.tsx",
		);
		const submitSource = readSource(
			"components/modals/new-job/job-submit-button.tsx",
		);
		const tableSource = readSource(
			"components/tables-2/new-job-install-tasks/data-table.tsx",
		);

		assertContains(modalSource, 'className="min-w-0 w-full max-w-full"');
		assertContains(modalSource, "overflow-x-hidden");
		assertContains(
			modalSource,
			"[&_[data-radix-scroll-area-viewport]>div]:!min-w-0",
		);
		assertContains(formSource, "min-w-0 w-full max-w-full");
		assertContains(footerSource, "flex-row");
		assertNotContains(submitSource, "{...form}");
		assertContains(tableSource, "scrollbar-hide");
	});

	it("keeps the install task list off the embedded raw table", () => {
		const source = readSource(
			"components/modals/new-job/install-tasks-list.tsx",
		);

		assertContains(source, "NewJobInstallTasksTable");
		assertContains(source, "data={taskRows}");
		assertContains(source, "control={form.control}");
		assertContains(source, "showTaskQty={showTaskQty}");
		assertNotContains(source, "<table");
		assertNotContains(source, "<thead");
		assertNotContains(source, "<tbody");
		assertNotContains(source, "<tr");
		assertNotContains(source, "<td");
		assertNotContains(source, "InputGroup");
		assertNotContains(source, "Controller");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/new-job-install-tasks/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="new-job-install-tasks-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
		assertContains(source, 'useMediaQuery("(max-width: 767px)")');
		assertContains(source, "effectiveColumnVisibility");
		assertContains(source, "showTaskQty && !isSmallScreen");
	});

	it("keeps compact editable item, rate, quantity, and total columns", () => {
		const source = readSource(
			"components/tables-2/new-job-install-tasks/columns.tsx",
		);

		assertContains(source, 'id: "task"');
		assertContains(source, 'id: "rate"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "total"');
		assertContains(source, "`job.tasks.${row.original.index}.qty`");
		assertContains(
			source,
			"max={meta?.isAdmin ? row.original.maxQty : undefined}",
		);
		assertContains(source, "disabled={row.original.maxQty === 0}");
		assertContains(source, "InputGroup.Addon");
		assertContains(source, "NumberFlow");
		assertContains(source, "sizes.custom(170, 420, 180)");
		assertContains(source, "sizes.custom(84, 124, 96)");
		assertContains(source, "sizes.custom(100, 168, 120)");
		assertContains(source, "sizes.custom(96, 132, 108)");
		assertContains(source, 'className="md:hidden"');
		assertContains(source, "Max: {row.original.maxQty}.");
		assertContains(source, "Rate: {formatCompactMoney(row.original.rate)}.");
		assertContains(source, "formatCompactMoney(");
	});

	it("registers compact content-fit new job install task table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"new-job-install-tasks"');
		assertContains(configSource, '"new-job-install-tasks": {');
		assertContains(configSource, 'tableId: "new-job-install-tasks"');
		assertContains(configSource, "rowHeight: 56");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["task", "qty"])',
		);
	});
});
