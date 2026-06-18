import { describe, expect, it } from "bun:test";
import {
	removeWorkflowMouldingSelection,
	saveWorkflowMouldingSelectionWithQty,
} from "./workflow-moulding-actions";

describe("workflow moulding actions", () => {
	it("removes a moulding row and updates persisted rows", () => {
		const patch = removeWorkflowMouldingSelection({
			line: {
				uid: "line-1",
				meta: {},
				formSteps: [
					{
						step: { title: "Moulding" },
						prodUid: "moulding-a",
						meta: {
							selectedProdUids: ["moulding-a", "moulding-b"],
							selectedComponents: [
								{
									id: 1,
									uid: "moulding-a",
									title: "Moulding A",
									salesPrice: 10,
									basePrice: 8,
								},
								{
									id: 2,
									uid: "moulding-b",
									title: "Moulding B",
									salesPrice: 12,
									basePrice: 9,
								},
							],
						},
					},
				],
			},
			mouldingUid: "moulding-a",
			rows: [
				{
					uid: "moulding-a",
					title: "Moulding A",
					qty: 2,
					estimateUnit: 10,
					lineTotal: 20,
				},
				{
					uid: "moulding-b",
					title: "Moulding B",
					qty: 3,
					estimateUnit: 12,
					lineTotal: 36,
				},
			],
			selectedMouldings: [
				{
					id: 2,
					uid: "moulding-b",
					title: "Moulding B",
					salesPrice: 12,
					basePrice: 9,
				},
			],
		});

		expect((patch.meta.mouldingRows as any[])).toHaveLength(1);
		expect((patch.meta.mouldingRows as any[])[0]?.uid).toBe("moulding-b");
		expect(patch.formSteps?.[0]?.prodUid).toBe("moulding-b");
		expect(patch.formSteps?.[0]?.meta?.selectedProdUids).toEqual([
			"moulding-b",
		]);
	});

	it("selects a moulding component with quantity and recalculates totals", () => {
		const patch = saveWorkflowMouldingSelectionWithQty({
			line: {
				uid: "line-1",
				meta: {},
			},
			steps: [
				{
					step: { title: "Moulding" },
					prodUid: "",
					meta: {},
				},
			],
			stepIndex: 0,
			component: {
				id: 1,
				uid: "moulding-a",
				title: "Moulding A",
				salesPrice: 15,
				basePrice: 9,
			},
			visibleComponents: [
				{
					id: 1,
					uid: "moulding-a",
					title: "Moulding A",
					salesPrice: 15,
					basePrice: 9,
				},
			],
			qty: "3",
			activeStepTitle: "Moulding",
		});

		expect(patch?.formSteps[0]?.prodUid).toBe("moulding-a");
		expect(patch?.formSteps[0]?.meta?.selectedProdUids).toEqual([
			"moulding-a",
		]);
		expect((patch?.meta.mouldingRows as any[])[0]?.qty).toBe(3);
		expect(patch?.qty).toBe(3);
		expect(patch?.unitPrice).toBe(15);
		expect(patch?.lineTotal).toBe(45);
	});
});
