import { describe, expect, it } from "bun:test";
import { evaluateSalesDocumentReadiness } from "./evaluator";

function createSale(overrides: Record<string, unknown> = {}) {
	return {
		id: 23288,
		orderId: "08574PC",
		type: "order",
		updatedAt: new Date("2026-06-17T12:00:00.000Z"),
		meta: {},
		subTotal: 9335.27,
		tax: 653.47,
		grandTotal: 9988.74,
		amountDue: 0,
		taxPercentage: 7,
		paymentMethod: null,
		extraCosts: [],
		taxes: [{ taxxable: 9335.27 }],
		items: [
			{
				id: 162865,
				qty: null,
				total: null,
				formSteps: [],
				housePackageTool: {
					id: 44001,
					totalDoors: 0,
					totalPrice: 0,
					doors: [
						{
							id: 501,
							totalQty: 10,
							lhQty: 5,
							rhQty: 5,
							unitPrice: 250,
							lineTotal: 2500,
						},
						{
							id: 502,
							totalQty: 9,
							lhQty: 4,
							rhQty: 5,
							unitPrice: 280.234444,
							lineTotal: 2522.11,
						},
					],
				},
			},
			{
				id: 162866,
				qty: 1,
				total: 4313.16,
				formSteps: [],
				housePackageTool: null,
			},
		],
		...overrides,
	};
}

function requireDoorItem(sale: ReturnType<typeof createSale>) {
	const item = sale.items[0];
	if (!item?.housePackageTool) {
		throw new Error("Expected a door item fixture.");
	}
	return { item, housePackageTool: item.housePackageTool };
}

describe("evaluateSalesDocumentReadiness", () => {
	it("stages only parent aggregate repairs when door rows preserve the invoice total", () => {
		const result = evaluateSalesDocumentReadiness(createSale());

		expect(result.status).toBe("repair_required");
		if (result.status !== "repair_required") return;
		expect(result.financial.totalChanged).toBe(false);
		expect(result.financial.saved).toEqual({
			subTotalCents: 933527,
			taxableSubTotalCents: 933527,
			taxCents: 65347,
			grandTotalCents: 998874,
			amountDueCents: 0,
		});
		expect(result.operations).toEqual([
			{
				kind: "sync_door_group_totals",
				salesOrderItemId: 162865,
				housePackageToolId: 44001,
				before: {
					itemQty: null,
					itemTotalCents: null,
					hptTotalDoors: 0,
					hptTotalPriceCents: 0,
				},
				after: {
					itemQty: 19,
					itemTotalCents: 502211,
					hptTotalDoors: 19,
					hptTotalPriceCents: 502211,
				},
				doorIds: [501, 502],
			},
		]);
	});

	it("accepts a fully reconciled document", () => {
		const sale = createSale();
		const { item, housePackageTool } = requireDoorItem(sale);
		item.qty = 19;
		item.total = 5022.11;
		housePackageTool.totalDoors = 19;
		housePackageTool.totalPrice = 5022.11;

		const result = evaluateSalesDocumentReadiness(sale);

		expect(result.status).toBe("ready");
	});

	it("stages stale non-zero parent summaries when the invoice total is unchanged", () => {
		const sale = createSale();
		const { item, housePackageTool } = requireDoorItem(sale);
		item.qty = 18;
		item.total = 5000;
		housePackageTool.totalDoors = 18;
		housePackageTool.totalPrice = 5000;

		const result = evaluateSalesDocumentReadiness(sale);

		expect(result.status).toBe("repair_required");
		expect(result.financial.totalChanged).toBe(false);
		expect(result.operations).toHaveLength(1);
		expect(result.findings[0]?.kind).toBe("conflicting_door_group_totals");
	});

	it("requires financial review when repaired line totals do not match the saved subtotal", () => {
		const result = evaluateSalesDocumentReadiness(
			createSale({ subTotal: 9300, grandTotal: 9953.47 }),
		);

		expect(result.status).toBe("financial_review");
		if (result.status !== "financial_review") return;
		expect(result.financial.totalChanged).toBe(true);
		expect(result.financial.subTotalDeltaCents).toBe(3527);
		expect(result.financial.grandTotalDeltaCents).toBe(3527);
		expect(result.operations).toHaveLength(1);
	});

	it("blocks a zero-subtotal repair when taxable allocation changes tax and grand total", () => {
		const itemTypeStep = {
			id: 1,
			stepId: 1,
			value: "Service",
			step: { title: "Item Type" },
		};
		const result = evaluateSalesDocumentReadiness(
			createSale({
				subTotal: 1000,
				tax: 28,
				grandTotal: 1028,
				amountDue: 1028,
				taxes: [{ taxxable: 400 }],
				items: [
					{
						id: 1,
						total: 400,
						meta: { taxxable: true },
						formSteps: [itemTypeStep],
						housePackageTool: {
							id: 11,
							totalDoors: 1,
							totalPrice: 400,
							doors: [
								{
									id: 101,
									totalQty: 1,
									unitPrice: 500,
									lineTotal: 500,
								},
							],
						},
					},
					{
						id: 2,
						total: 600,
						meta: { taxxable: false },
						formSteps: [{ ...itemTypeStep, id: 2 }],
						housePackageTool: {
							id: 12,
							totalDoors: 1,
							totalPrice: 600,
							doors: [
								{
									id: 102,
									totalQty: 1,
									unitPrice: 500,
									lineTotal: 500,
								},
							],
						},
					},
				],
			}),
		);

		expect(result.status).toBe("financial_review");
		expect(result.financial.subTotalDeltaCents).toBe(0);
		expect(result.financial.taxableSubTotalDeltaCents).toBe(10000);
		expect(result.financial.taxDeltaCents).toBe(700);
		expect(result.financial.grandTotalDeltaCents).toBe(700);
		expect(result.financial.amountDueDeltaCents).toBe(700);
	});

	it("requires manual review for conflicting active form-step revisions", () => {
		const sale = createSale();
		const { item } = requireDoorItem(sale);
		item.formSteps = [
			{ id: 1, stepId: 9, componentId: 10, prodUid: "a", value: "A" },
			{ id: 2, stepId: 9, componentId: 11, prodUid: "b", value: "B" },
		];

		const result = evaluateSalesDocumentReadiness(sale);

		expect(result.status).toBe("manual_review");
	});
});
