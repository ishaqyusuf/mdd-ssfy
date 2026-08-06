import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const dialogSource = readFileSync(
	new URL("./sales-workflow-cancellation-dialog.tsx", import.meta.url),
	"utf8",
);
const menuSource = readFileSync(
	new URL("./sales-menu.tsx", import.meta.url),
	"utf8",
);

describe("sales workflow cancellation UI", () => {
	it("loads the review only while the dialog is open", () => {
		expect(dialogSource.includes("enabled: open")).toBe(true);
		expect(dialogSource.includes("workflowCancellationPreview")).toBe(true);
	});

	it("requires a reason and disables confirmation for blockers or stale loading", () => {
		expect(dialogSource.includes("reason.trim().length >= 3")).toBe(true);
		expect(dialogSource.includes("Boolean(data?.allowed)")).toBe(true);
		expect(dialogSource.includes("!preview.isFetching")).toBe(true);
	});

	it("keeps cancellation single-order and opens the dialog after closing the menu", () => {
		expect(menuSource.includes("salesIds.length === 1")).toBe(true);
		expect(menuSource.includes("setOpen(false)")).toBe(true);
		expect(menuSource.includes("setWorkflowCancellationAction(action)")).toBe(
			true,
		);
	});

	it("states that inbound and stock evidence remain preserved", () => {
		expect(dialogSource.includes("Preserved evidence")).toBe(true);
		expect(dialogSource.includes("data.preserved.message")).toBe(true);
	});
});
