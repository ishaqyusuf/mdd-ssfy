import { describe, expect, it } from "bun:test";
import { createSalesHistoryRestoreRecord } from "./history-restore";

describe("createSalesHistoryRestoreRecord", () => {
	it("keeps the current sales identity and strips history-copy persistence ids", () => {
		const current = {
			salesId: 100,
			slug: "order-100",
			orderId: "00100AA",
			type: "order",
			status: "Draft",
			inventoryStatus: "PENDING",
			version: "current-version",
			updatedAt: "2026-07-18T10:00:00.000Z",
			settings: { cccPercentage: 3 },
			paymentTotal: 25,
			paymentCount: 1,
			paymentMethodReviewDismissed: true,
		} as any;
		const snapshot = {
			...current,
			salesId: 900,
			slug: "00100AA-hx01",
			orderId: "00100AA-hx01",
			version: "history-version",
			lineItems: [
				{
					id: 901,
					uid: "line-1",
					meta: {
						mouldingRows: [{ id: 1, salesItemId: 902, hptId: 903 }],
					},
					formSteps: [{ id: 904, stepId: 1 }],
					shelfItems: [{ id: 905, categoryId: 1 }],
					housePackageTool: {
						id: 906,
						doors: [{ id: 907, dimension: "2-6 x 6-8" }],
					},
				},
			],
			extraCosts: [{ id: 908, label: "Labor", type: "Labor", amount: 5 }],
		} as any;

		const restored = createSalesHistoryRestoreRecord(current, snapshot);

		expect(restored.salesId).toBe(100);
		expect(restored.orderId).toBe("00100AA");
		expect(restored.version).toBe("current-version");
		expect(restored.lineItems[0]?.id).toBe(null);
		expect(restored.lineItems[0]?.formSteps[0]?.id).toBe(null);
		expect(restored.lineItems[0]?.shelfItems[0]?.id).toBe(null);
		expect(restored.lineItems[0]?.housePackageTool?.id).toBe(null);
		expect(restored.lineItems[0]?.housePackageTool?.doors[0]?.id).toBe(null);
		expect(
			(restored.lineItems[0]?.meta as any).mouldingRows[0].salesItemId,
		).toBe(null);
		expect(restored.extraCosts[0]?.id).toBe(null);
	});
});
