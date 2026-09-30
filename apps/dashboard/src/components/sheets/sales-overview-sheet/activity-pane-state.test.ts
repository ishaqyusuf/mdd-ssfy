import { describe, expect, test } from "bun:test";
import { resolveSalesOverviewActivityPresentation } from "./activity-pane-state";

const general = {
	mode: "default" as const,
	activeTab: "general" as const,
	isSideBySide: true,
	hasSale: true,
	dismissed: false,
	hasWorkflowPane: false,
};

describe("Sales Overview Activity presentation", () => {
	test("opens beside General and removes duplicate main navigation on wide screens", () => {
		expect(resolveSalesOverviewActivityPresentation(general)).toEqual({
			primaryTab: "general",
			hideActivityTab: true,
			showActivityPane: true,
		});
	});

	test("other main tabs never show the automatic pane", () => {
		for (const activeTab of [
			"production",
			"transactions",
			"inventory",
			"dispatch",
			"packing",
		] as const) {
			expect(
				resolveSalesOverviewActivityPresentation({ ...general, activeTab }),
			).toEqual({
				primaryTab: activeTab,
				hideActivityTab: true,
				showActivityPane: false,
			});
		}
	});

	test("manual dismissal preserves General without restoring a duplicate tab", () => {
		expect(
			resolveSalesOverviewActivityPresentation({ ...general, dismissed: true }),
		).toEqual({
			primaryTab: "general",
			hideActivityTab: true,
			showActivityPane: false,
		});
	});

	test("workflow detail takes priority and returning to General restores Activity", () => {
		expect(
			resolveSalesOverviewActivityPresentation({
				...general,
				hasWorkflowPane: true,
			}).showActivityPane,
		).toBe(false);
		expect(
			resolveSalesOverviewActivityPresentation(general).showActivityPane,
		).toBe(true);
		expect(
			resolveSalesOverviewActivityPresentation({ ...general, dismissed: true })
				.showActivityPane,
		).toBe(false);
	});

	test("small screens retain General and restore the ordinary Activity tab", () => {
		expect(
			resolveSalesOverviewActivityPresentation({
				...general,
				isSideBySide: false,
			}),
		).toEqual({
			primaryTab: "general",
			hideActivityTab: false,
			showActivityPane: false,
		});
	});

	test("Activity route uses the primary pane on small screens and General plus Activity on wide screens", () => {
		expect(
			resolveSalesOverviewActivityPresentation({
				...general,
				activeTab: "activity",
				isSideBySide: false,
			}),
		).toEqual({
			primaryTab: "activity",
			hideActivityTab: false,
			showActivityPane: false,
		});
		expect(
			resolveSalesOverviewActivityPresentation({
				...general,
				activeTab: "activity",
			}),
		).toEqual({
			primaryTab: "general",
			hideActivityTab: true,
			showActivityPane: true,
		});
	});

	test("does not open Activity before sale identity is ready", () => {
		expect(
			resolveSalesOverviewActivityPresentation({ ...general, hasSale: false })
				.showActivityPane,
		).toBe(false);
	});

	test("preserves assigned-production and dispatch navigation contracts", () => {
		for (const mode of ["assigned-production", "dispatch-modal"] as const) {
			expect(
				resolveSalesOverviewActivityPresentation({
					...general,
					mode,
					activeTab: "production",
				}),
			).toEqual({
				primaryTab: "production",
				hideActivityTab: false,
				showActivityPane: false,
			});
		}
	});
});
