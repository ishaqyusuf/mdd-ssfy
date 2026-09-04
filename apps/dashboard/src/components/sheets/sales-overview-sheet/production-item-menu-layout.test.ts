import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const itemMenuSource = readFileSync(
	new URL("./production-item-menu.tsx", import.meta.url),
	"utf8",
);
const footerSource = readFileSync(
	new URL("./production-tab-footer.tsx", import.meta.url),
	"utf8",
);

describe("Production item action menu layout", () => {
	it("keeps all four actions and quantities on one line with standard icons", () => {
		expect(itemMenuSource).toMatch(/<Menu\s+noSize/);
		expect(itemMenuSource).toMatch(
			/min-w-\[250px\] whitespace-nowrap \[&>svg\]:size-4 \[&>svg\]:shrink-0/,
		);
		expect(
			itemMenuSource.match(/className=\{productionActionItemClassName\}/g)
				?.length,
		).toBe(4);
	});

	it("shows pending feedback and confirms destructive bulk actions", () => {
		expect(itemMenuSource).toContain("aria-busy={isBusy}");
		expect(itemMenuSource).toContain("tsk.isLoading");
		expect(itemMenuSource).toContain("menuBusyRef.current");
		expect(itemMenuSource).toContain("setMenuBusy(true)");
		expect(footerSource).toContain("menuBusyRef.current");
		expect(footerSource).toContain("setMenuBusy={updateMenuBusy}");
		expect(itemMenuSource).toContain('value="confirm"');
		expect(itemMenuSource).toContain('variant="destructive"');
		expect(itemMenuSource).toContain("getProductionDeleteConfirmation");
	});

	it("defaults assignments to the order due date and refreshes before clearing", () => {
		expect(itemMenuSource).toContain("getProductionOrderDueDate");
		expect(itemMenuSource).toContain(
			"orderDueDate: orderDueDate ? [orderDueDate]",
		);
		expect(itemMenuSource).toContain(
			"queryCtx.salesQuery.assignmentSubmissionUpdated()",
		);
		expect(itemMenuSource).toContain("await Promise.allSettled");
		expect(itemMenuSource).toContain("hasProductionRefreshFailure");
		expect(itemMenuSource).toContain("prod.refetch()");
	});
});
