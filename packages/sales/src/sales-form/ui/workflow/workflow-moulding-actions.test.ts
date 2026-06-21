import { describe, expect, it } from "bun:test";
import {
	removeWorkflowMouldingSelection,
	saveWorkflowMouldingSelectionWithQty,
} from "./workflow-moulding-actions";

describe("workflow moulding actions", () => {
	it("does not remove the final selected moulding row", () => {
		const patch = removeWorkflowMouldingSelection({
			line: {
				uid: "line-1",
				meta: {},
				formSteps: [
					{
						step: { title: "Moulding" },
						prodUid: "moulding-a",
						meta: {
							selectedProdUids: ["moulding-a"],
							selectedComponents: [
								{
									id: 1,
									uid: "moulding-a",
									title: "Moulding A",
									salesPrice: 10,
									basePrice: 8,
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
			],
			selectedMouldings: [
				{
					id: 1,
					uid: "moulding-a",
					title: "Moulding A",
					salesPrice: 10,
					basePrice: 8,
				},
			],
		});

		expect(patch).toBeNull();
	});

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

	it("removes a moulding row when selected state is stored on nested step metadata", () => {
		const patch = removeWorkflowMouldingSelection({
			line: {
				uid: "line-1",
				meta: {},
				formSteps: [
					{
						step: {
							title: "Moulding",
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
						prodUid: "",
						meta: {},
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
			selectedMouldings: [],
		});

		expect((patch?.meta.mouldingRows as any[])).toHaveLength(1);
		expect((patch?.meta.mouldingRows as any[])[0]?.uid).toBe("moulding-b");
		expect(patch?.formSteps?.[0]?.prodUid).toBe("moulding-b");
		expect(patch?.formSteps?.[0]?.meta?.selectedProdUids).toEqual([
			"moulding-b",
		]);
		expect(patch?.formSteps?.[0]?.meta?.selectedComponents?.[0]?.title).toBe(
			"Moulding B",
		);
	});

	it("removes a moulding row when nested step metadata is stored as JSON", () => {
		const patch = removeWorkflowMouldingSelection({
			line: {
				uid: "line-1",
				meta: {},
				formSteps: [
					{
						step: {
							title: "Moulding",
							meta: JSON.stringify({
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
							}),
						},
						prodUid: "",
						meta: {},
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
			selectedMouldings: [],
		});

		expect(patch?.formSteps?.[0]?.prodUid).toBe("moulding-b");
		expect(patch?.formSteps?.[0]?.meta?.selectedProdUids).toEqual([
			"moulding-b",
		]);
		expect(patch?.formSteps?.[0]?.meta?.selectedComponents?.[0]?.uid).toBe(
			"moulding-b",
		);
	});

	it("removes a moulding row without spreading JSON line or step metadata", () => {
		const patch = removeWorkflowMouldingSelection({
			line: {
				uid: "line-1",
				meta: JSON.stringify({
					preserve: "yes",
					mouldingRows: [
						{ uid: "moulding-a", qty: 2 },
						{ uid: "moulding-b", qty: 3 },
					],
				}),
				formSteps: [
					{
						step: { title: "Moulding" },
						prodUid: "moulding-a",
						meta: JSON.stringify({
							preserveStep: true,
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
						}),
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
			selectedMouldings: [],
		});

		expect(patch?.meta.preserve).toBe("yes");
		expect(Object.keys(patch?.meta || {})).not.toContain("0");
		expect(patch?.formSteps?.[0]?.meta?.preserveStep).toBe(true);
		expect(patch?.formSteps?.[0]?.meta?.selectedProdUids).toEqual([
			"moulding-b",
		]);
		expect(Object.keys((patch?.formSteps?.[0]?.meta || {}) as any)).not.toContain(
			"0",
		);
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

	it("clamps blank or zero moulding selection quantity to one", () => {
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
			qty: "0",
			activeStepTitle: "Moulding",
		});

		expect((patch?.meta.mouldingRows as any[])[0]?.qty).toBe(1);
		expect(patch?.qty).toBe(1);
		expect(patch?.lineTotal).toBe(15);
	});

	it("selects moulding with quantity from JSON line metadata", () => {
		const patch = saveWorkflowMouldingSelectionWithQty({
			line: {
				uid: "line-1",
				meta: JSON.stringify({
					preserve: "line-meta",
					mouldingRows: [
						{
							uid: "moulding-a",
							title: "Moulding A",
							qty: 2,
							salesPrice: 15,
							lineTotal: 30,
						},
					],
				}),
			},
			steps: [
				{
					step: { title: "Moulding" },
					prodUid: "moulding-a",
					meta: {
						selectedProdUids: ["moulding-a"],
						selectedComponents: [
							{
								id: 1,
								uid: "moulding-a",
								title: "Moulding A",
								salesPrice: 15,
								basePrice: 9,
							},
						],
					},
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
			qty: "5",
			activeStepTitle: "Moulding",
		});

		expect(patch?.meta.preserve).toBe("line-meta");
		expect(Object.keys(patch?.meta || {})).not.toContain("0");
		expect((patch?.meta.mouldingRows as any[])[0]?.qty).toBe(5);
		expect(patch?.qty).toBe(5);
		expect(patch?.lineTotal).toBe(75);
	});

	it("updates an already-selected moulding quantity without deselecting it", () => {
		const patch = saveWorkflowMouldingSelectionWithQty({
			line: {
				uid: "line-1",
				meta: {
					mouldingRows: [
						{
							uid: "moulding-a",
							title: "Moulding A",
							qty: 2,
							salesPrice: 15,
							lineTotal: 30,
						},
					],
				},
			},
			steps: [
				{
					step: { title: "Moulding" },
					prodUid: "moulding-a",
					meta: {
						selectedProdUids: ["moulding-a"],
						selectedComponents: [
							{
								id: 1,
								uid: "moulding-a",
								title: "Moulding A",
								salesPrice: 15,
								basePrice: 9,
							},
						],
					},
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
			qty: "5",
			activeStepTitle: "Moulding",
		});

		expect(patch?.formSteps[0]?.meta?.selectedProdUids).toEqual([
			"moulding-a",
		]);
		expect((patch?.meta.mouldingRows as any[])[0]?.qty).toBe(5);
		expect(patch?.qty).toBe(5);
		expect(patch?.lineTotal).toBe(75);
	});
});
