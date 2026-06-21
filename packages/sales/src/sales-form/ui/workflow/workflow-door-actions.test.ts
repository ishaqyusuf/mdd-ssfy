import { describe, expect, it } from "bun:test";
import {
	addWorkflowHptDoorOption,
	removeWorkflowHptDoorOption,
	removeWorkflowSelectedComponent,
	swapWorkflowDoorComponent,
	updateWorkflowDoorSupplier,
} from "./workflow-door-actions";

describe("workflow door actions", () => {
	it("updates door supplier metadata on the selected step", () => {
		const patch = updateWorkflowDoorSupplier({
			line: {
				uid: "line-1",
				qty: 2,
				lineTotal: 240,
				formSteps: [
					{
						step: { title: "Door" },
						meta: {
							formStepMeta: {
								supplierUid: null,
							},
						},
					},
				],
			},
			stepIndex: 0,
			supplier: {
				uid: "supplier-1",
				name: "Supplier One",
			},
		});

		expect(patch?.formSteps?.[0]?.meta?.formStepMeta).toEqual({
			supplierUid: "supplier-1",
			supplierName: "Supplier One",
		});
	});

	it("updates door supplier metadata without spreading JSON step metadata", () => {
		const patch = updateWorkflowDoorSupplier({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						meta: JSON.stringify({
							formStepMeta: {
								supplierUid: null,
								legacyFlag: "keep",
							},
							selectedProdUids: ["door-a"],
						}),
					},
				],
			},
			stepIndex: 0,
			supplier: {
				uid: "supplier-1",
				name: "Supplier One",
			},
		});

		expect(patch?.formSteps?.[0]?.meta?.formStepMeta).toEqual({
			supplierUid: "supplier-1",
			legacyFlag: "keep",
			supplierName: "Supplier One",
		});
		expect(patch?.formSteps?.[0]?.meta?.selectedProdUids).toEqual(["door-a"]);
		expect(Object.keys((patch?.formSteps?.[0]?.meta || {}) as any)).not.toContain(
			"0",
		);
	});

	it("reprices persisted HPT rows when the door supplier changes", () => {
		const patch = updateWorkflowDoorSupplier({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						componentId: 1,
						value: "Door A",
						meta: {
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
									basePrice: 120,
									supplierVariants: [
										{
											supplierUid: "supplier-1",
											meta: { size: "2-0 x 7-0" },
											costPrice: 80,
										},
									],
								},
							],
						},
					},
					{
						step: { title: "Specie" },
						price: 5,
					},
				],
				housePackageTool: {
					doors: [
						{
							stepProductId: 1,
							dimension: "2-0 x 7-0",
							totalQty: 2,
							unitPrice: 120,
							lineTotal: 240,
							meta: {},
						},
					],
				},
			},
			stepIndex: 0,
			supplier: {
				uid: "supplier-1",
				name: "Supplier One",
			},
			profileCoefficient: 2,
		});

		const doors = (patch?.housePackageTool as any)?.doors || [];
		expect(doors[0]?.unitPrice).toBe(45);
		expect(doors[0]?.lineTotal).toBe(90);
		expect(doors[0]?.meta?.baseUnitPrice).toBe(80);
		expect(doors[0]?.meta?.priceMissing).toBe(false);
		expect((patch?.housePackageTool as any)?.totalDoors).toBe(2);
		expect((patch?.housePackageTool as any)?.totalPrice).toBe(90);
		expect(patch?.qty).toBe(2);
		expect(patch?.lineTotal).toBe(90);
	});

	it("marks persisted HPT rows missing when supplier pricing is unavailable", () => {
		const patch = updateWorkflowDoorSupplier({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						componentId: 1,
						value: "Door A",
						meta: {
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
									basePrice: 120,
									supplierVariants: [],
								},
							],
						},
					},
					{
						step: { title: "Specie" },
						price: 5,
					},
				],
				housePackageTool: {
					doors: [
						{
							stepProductId: 1,
							dimension: "2-0 x 7-0",
							totalQty: 2,
							unitPrice: 120,
							lineTotal: 240,
							meta: {},
						},
					],
				},
			},
			stepIndex: 0,
			supplier: {
				uid: "supplier-2",
				name: "Supplier Two",
			},
			profileCoefficient: 2,
		});

		const doors = (patch?.housePackageTool as any)?.doors || [];
		expect(doors[0]?.unitPrice).toBe(0);
		expect(doors[0]?.lineTotal).toBe(0);
		expect(doors[0]?.totalQty).toBe(0);
		expect(doors[0]?.meta?.priceMissing).toBe(true);
		expect((patch?.housePackageTool as any)?.totalDoors).toBe(0);
		expect((patch?.housePackageTool as any)?.totalPrice).toBe(0);
		expect(patch?.qty).toBe(0);
		expect(patch?.lineTotal).toBe(0);
	});

	it("clears a selected multi-select component and truncates later steps", () => {
		const result = removeWorkflowSelectedComponent({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						meta: {
							selectedProdUids: ["door-a", "door-b"],
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
									salesPrice: 100,
									basePrice: 80,
								},
								{
									id: 2,
									uid: "door-b",
									title: "Door B",
									salesPrice: 120,
									basePrice: 90,
								},
							],
						},
					},
					{
						step: { title: "Line Item" },
					},
				],
			},
			stepIndex: 0,
			componentUid: "door-a",
		});

		expect(result?.activeStepIndex).toBe(0);
		expect(result?.linePatch.formSteps).toHaveLength(1);
		expect(result?.linePatch.formSteps?.[0]?.prodUid).toBe("door-b");
		expect(result?.linePatch.formSteps?.[0]?.price).toBe(120);
	});

	it("swaps a selected door component and remaps persisted rows", () => {
		const result = swapWorkflowDoorComponent({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						value: "Door A",
						componentId: 1,
						meta: {
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
								},
							],
						},
					},
				],
				housePackageTool: {
					doors: [
						{
							stepProductId: 1,
							dimension: "2-0 x 7-0",
							totalQty: 2,
							unitPrice: 100,
							lineTotal: 200,
						},
					],
				},
			},
			stepIndex: 0,
			sourceComponent: {
				id: 1,
				uid: "door-a",
				title: "Door A",
			},
			targetComponent: {
				id: 2,
				uid: "door-b",
				title: "Door B",
				salesPrice: 150,
				basePrice: 100,
			},
		});

		expect(result?.activeDoorUid).toBe("door-b");
		expect(result?.linePatch.formSteps?.[0]?.prodUid).toBe("door-b");
		expect(result?.linePatch.formSteps?.[0]?.meta?.selectedProdUids).toEqual([
			"door-b",
		]);
	});

	it("swaps a selected door component from JSON selected-component metadata", () => {
		const result = swapWorkflowDoorComponent({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						value: "Door A",
						componentId: 1,
						meta: JSON.stringify({
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
									redirectUid: "route-a",
								},
							],
						}),
					},
				],
				housePackageTool: {
					doors: [
						{
							stepProductId: 1,
							dimension: "2-0 x 7-0",
							totalQty: 2,
							unitPrice: 100,
							lineTotal: 200,
						},
					],
				},
			},
			stepIndex: 0,
			sourceComponent: {
				id: 1,
				uid: "door-a",
				title: "Door A",
			},
			targetComponent: {
				id: 2,
				uid: "door-b",
				title: "Door B",
				salesPrice: 150,
				basePrice: 100,
			},
		});

		expect(result?.activeDoorUid).toBe("door-b");
		expect(result?.linePatch.formSteps?.[0]?.prodUid).toBe("door-b");
		expect(result?.linePatch.formSteps?.[0]?.meta?.selectedComponents).toEqual([
			expect.objectContaining({
				uid: "door-b",
				redirectUid: "route-a",
			}),
		]);
		expect(Object.keys((result?.linePatch.formSteps?.[0]?.meta || {}) as any)).not.toContain(
			"0",
		);
	});

	it("adds an HPT door option without changing configured door rows", () => {
		const result = addWorkflowHptDoorOption({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						value: "Door A",
						componentId: 1,
						meta: {
							selectedProdUids: ["door-a"],
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
									salesPrice: 100,
									basePrice: 80,
								},
							],
						},
					},
				],
				housePackageTool: {
					doors: [
						{
							stepProductId: 1,
							dimension: "2-0 x 7-0",
							totalQty: 2,
							unitPrice: 100,
							lineTotal: 200,
						},
					],
				},
			},
			stepIndex: 0,
			component: {
				id: 2,
				uid: "door-b",
				title: "Door B",
				salesPrice: 140,
				basePrice: 90,
			},
		});

		expect(result?.activeDoorUid).toBe("door-b");
		expect(result?.linePatch.formSteps?.[0]?.prodUid).toBe("door-a");
		expect(result?.linePatch.formSteps?.[0]?.value).toBe("Door A +1");
		expect(result?.linePatch.formSteps?.[0]?.meta?.selectedProdUids).toEqual([
			"door-a",
			"door-b",
		]);
		expect(result?.linePatch.housePackageTool).toBeUndefined();
		expect(result?.linePatch.qty).toBeUndefined();
	});

	it("does not duplicate an HPT door option from JSON selected-component metadata", () => {
		const result = addWorkflowHptDoorOption({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						value: "Door A",
						componentId: 1,
						meta: JSON.stringify({
							selectedProdUids: ["door-a"],
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
								},
							],
						}),
					},
				],
			},
			stepIndex: 0,
			component: {
				id: 1,
				uid: "door-a",
				title: "Door A",
			},
		});

		expect(result).toBeNull();
	});

	it("removes an HPT door option and updates door totals", () => {
		const result = removeWorkflowHptDoorOption({
			routeData: {},
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						meta: {
							selectedProdUids: ["door-a", "door-b"],
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
								},
								{
									id: 2,
									uid: "door-b",
									title: "Door B",
								},
							],
						},
					},
				],
				housePackageTool: {
					doors: [
						{
							stepProductId: 1,
							totalQty: 1,
							unitPrice: 100,
							lineTotal: 100,
						},
						{
							stepProductId: 2,
							totalQty: 2,
							unitPrice: 50,
							lineTotal: 100,
						},
					],
				},
			},
			stepIndex: 0,
			component: {
				id: 1,
				uid: "door-a",
			},
		});

		expect(result?.activeDoorUid).toBe("door-b");
		expect((result?.linePatch.housePackageTool as any)?.doors).toHaveLength(1);
		expect(result?.linePatch.qty).toBe(2);
		expect(result?.linePatch.lineTotal).toBe(100);
	});

	it("uses route config when removing an HPT door option", () => {
		const result = removeWorkflowHptDoorOption({
			routeData: {
				composedRouter: {
					"door-b": {
						config: {
							noHandle: true,
							hasSwing: false,
						},
					},
				},
			},
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { title: "Door" },
						prodUid: "door-a",
						meta: {
							selectedProdUids: ["door-a", "door-b"],
							selectedComponents: [
								{
									id: 1,
									uid: "door-a",
									title: "Door A",
								},
								{
									id: 2,
									uid: "door-b",
									title: "Door B",
								},
							],
						},
					},
				],
				housePackageTool: {
					doors: [
						{
							stepProductId: 1,
							totalQty: 1,
							unitPrice: 100,
							lineTotal: 100,
						},
						{
							stepProductId: 2,
							lhQty: 1,
							rhQty: 1,
							totalQty: 3,
							unitPrice: 50,
							lineTotal: 150,
							swing: "LH",
						},
					],
				},
			},
			stepIndex: 0,
			component: {
				id: 1,
				uid: "door-a",
			},
		});

		const remainingDoor = (result?.linePatch.housePackageTool as any)
			?.doors?.[0];
		expect(result?.activeDoorUid).toBe("door-b");
		expect(remainingDoor?.lhQty).toBe(0);
		expect(remainingDoor?.rhQty).toBe(0);
		expect(remainingDoor?.swing).toBe("");
		expect(result?.linePatch.qty).toBe(3);
		expect(result?.linePatch.lineTotal).toBe(150);
	});
});
