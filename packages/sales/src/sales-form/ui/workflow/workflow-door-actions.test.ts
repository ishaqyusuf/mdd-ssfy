import { describe, expect, it } from "bun:test";
import {
	addWorkflowHptDoorOption,
	reconcileWorkflowHptRowsForHeightChange,
	removeWorkflowHptDoorOption,
	removeWorkflowSelectedComponent,
	swapWorkflowDoorComponent,
	swapWorkflowHptDoorRowSize,
	updateWorkflowDoorSupplier,
} from "./workflow-door-actions";

describe("workflow door actions", () => {
	it("hot swaps one HPT size while preserving quantities and refreshing price", () => {
		const sourceRow = {
			id: 42,
			stepProductId: 1,
			dimension: "2-4 x 6-8",
			swing: "inswing",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			addon: 5,
			customPrice: 999,
			unitPrice: 999,
			lineTotal: 2_997,
			meta: {
				baseUnitPrice: 80,
				doorSalesUnitPrice: 80,
				sharedDoorSurcharge: 10,
				overridePrice: 999,
				customPrice: 999,
			},
		};
		const line = {
			uid: "line-1",
			formSteps: [{ step: { title: "Height" }, value: "8-0" }],
			housePackageTool: { doors: [sourceRow] },
		};

		const result = swapWorkflowHptDoorRowSize({
			line,
			rows: [sourceRow],
			sourceRow: { ...sourceRow },
			targetSize: "2-4 x 8-0",
			component: {
				id: 1,
				uid: "door-a",
				title: "Door A",
				pricing: { "2-4 x 8-0": { price: 120 } },
			},
			profileCoefficient: 1,
			sharedDoorSurcharge: 10,
			noHandle: false,
			hasSwing: true,
		});

		const row = (result?.linePatch.housePackageTool as any)?.doors?.[0];
		expect(row).toMatchObject({
			id: 42,
			dimension: "2-4 x 8-0",
			swing: "inswing",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			addon: 5,
			customPrice: null,
			unitPrice: 135,
			lineTotal: 405,
		});
		expect(row.meta).toMatchObject({
			baseUnitPrice: 120,
			doorSalesUnitPrice: 120,
			priceMissing: false,
			pendingUnpricedSizeSwap: false,
			overridePrice: null,
			customPrice: null,
		});
		expect(result?.linePatch.qty).toBe(3);
		expect(result?.linePatch.lineTotal).toBe(405);
	});

	it("does not normalize untouched sibling door rows with the active route", () => {
		const sourceRow = {
			id: 42,
			stepProductId: 1,
			dimension: "2-4 x 6-8",
			lhQty: 0,
			rhQty: 0,
			totalQty: 2,
			swing: "",
			unitPrice: 80,
			lineTotal: 160,
			meta: { baseUnitPrice: 80, doorSalesUnitPrice: 80 },
		};
		const siblingRow = {
			id: 43,
			stepProductId: 2,
			dimension: "3-0 x 6-8",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			swing: "inswing",
			unitPrice: 200,
			lineTotal: 600,
			meta: { baseUnitPrice: 200, doorSalesUnitPrice: 200 },
		};
		const result = swapWorkflowHptDoorRowSize({
			line: {
				uid: "line-1",
				housePackageTool: { doors: [sourceRow, siblingRow] },
			},
			rows: [sourceRow, siblingRow],
			sourceRow,
			targetSize: "2-4 x 8-0",
			component: {
				id: 1,
				uid: "door-a",
				title: "Door A",
				pricing: { "2-4 x 8-0": { price: 120 } },
			},
			profileCoefficient: 1,
			sharedDoorSurcharge: 0,
			noHandle: true,
			hasSwing: false,
		});

		const sibling = (result?.linePatch.housePackageTool as any)?.doors?.[1];
		expect(sibling).toEqual(siblingRow);
		expect(result?.linePatch.qty).toBe(5);
		expect(result?.linePatch.lineTotal).toBe(840);
	});

	it("reconciles existing HPT widths to a newly selected height", () => {
		const doorComponent = {
			id: 1,
			uid: "door-a",
			title: "Door A",
			pricing: {
				"2-4 x 6-8": { price: 80 },
				"2-4 x 8-0": { price: 120 },
			},
		};
		const line = {
			uid: "line-1",
			formSteps: [
				{ step: { uid: "height", title: "Height" }, value: "6-8" },
				{
					step: { uid: "door", title: "Door" },
					prodUid: "door-a",
					componentId: 1,
					meta: {
						selectedProdUids: ["door-a"],
						selectedComponents: [doorComponent],
					},
				},
			],
			housePackageTool: {
				doors: [
					{
						id: 42,
						stepProductId: 1,
						dimension: "2-4 x 6-8",
						lhQty: 1,
						rhQty: 2,
						totalQty: 3,
						unitPrice: 90,
						lineTotal: 270,
						meta: { baseUnitPrice: 80, doorSalesUnitPrice: 80 },
					},
				],
			},
		};
		const nextSteps = [
			{ step: { uid: "height", title: "Height" }, value: "8-0" },
			line.formSteps[1],
		];

		const patch = reconcileWorkflowHptRowsForHeightChange({
			line,
			nextSteps,
			routeData: {},
			profileCoefficient: 1,
		});

		const row = (patch?.housePackageTool as any)?.doors?.[0];
		expect(row).toMatchObject({
			id: 42,
			dimension: "2-4 x 8-0",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			unitPrice: 120,
			lineTotal: 360,
		});
		expect(patch?.qty).toBe(3);
		expect(patch?.lineTotal).toBe(360);
	});

	it("uses current catalog pricing when a reopened row has a stale snapshot", () => {
		const staleComponent = {
			id: 1,
			uid: "door-a",
			title: "Door A",
			pricing: { "2-4 x 6-8": { price: 80 } },
		};
		const currentComponent = {
			...staleComponent,
			pricing: { "2-4 x 8-0": { price: 150 } },
		};
		const line = {
			uid: "line-1",
			formSteps: [
				{ step: { title: "Height" }, value: "6-8" },
				{
					step: { title: "Door" },
					meta: { selectedComponents: [staleComponent] },
				},
			],
			housePackageTool: {
				doors: [
					{
						id: 42,
						stepProductId: 1,
						dimension: "2-4 x 6-8",
						lhQty: 1,
						rhQty: 2,
						totalQty: 3,
						unitPrice: 80,
						lineTotal: 240,
					},
				],
			},
		};
		const patch = reconcileWorkflowHptRowsForHeightChange({
			line,
			nextSteps: [
				{ step: { title: "Height" }, value: "8-0" },
				line.formSteps[1],
			],
			availableDoorComponents: [currentComponent],
			profileCoefficient: 1,
		});

		const row = (patch?.housePackageTool as any)?.doors?.[0];
		expect(row).toMatchObject({
			dimension: "2-4 x 8-0",
			unitPrice: 150,
			lineTotal: 450,
		});
		expect(row.meta.priceMissing).toBe(false);
	});

	it("reconciles multiple widths and door components without changing quantities", () => {
		const components = [
			{
				id: 1,
				uid: "door-a",
				title: "Door A",
				pricing: { "2-4 x 8-0": { price: 120 } },
			},
			{
				id: 2,
				uid: "door-b",
				title: "Door B",
				pricing: { "3-0 x 8-0": { price: 200 } },
			},
		];
		const line = {
			uid: "line-1",
			formSteps: [
				{ step: { title: "Height" }, value: "6-8" },
				{
					step: { title: "Door" },
					meta: { selectedComponents: components },
				},
			],
			housePackageTool: {
				doors: [
					{
						id: 42,
						stepProductId: 1,
						dimension: "2-4 x 6-8",
						lhQty: 1,
						rhQty: 2,
						totalQty: 3,
						unitPrice: 80,
						lineTotal: 240,
					},
					{
						id: 43,
						stepProductId: 2,
						dimension: "3-0 x 6-8",
						lhQty: 0,
						rhQty: 1,
						totalQty: 1,
						unitPrice: 150,
						lineTotal: 150,
					},
				],
			},
		};
		const patch = reconcileWorkflowHptRowsForHeightChange({
			line,
			nextSteps: [
				{ step: { title: "Height" }, value: "8-0" },
				line.formSteps[1],
			],
			availableDoorComponents: components,
			profileCoefficient: 1,
		});

		const rows = (patch?.housePackageTool as any)?.doors;
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			id: 42,
			dimension: "2-4 x 8-0",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			lineTotal: 360,
		});
		expect(rows[1]).toMatchObject({
			id: 43,
			dimension: "3-0 x 8-0",
			lhQty: 0,
			rhQty: 1,
			totalQty: 1,
			lineTotal: 200,
		});
		expect(patch).toMatchObject({ qty: 4, unitPrice: 140, lineTotal: 560 });
	});

	it("blocks a height change that would create duplicate row identities", () => {
		const component = {
			id: 1,
			uid: "door-a",
			title: "Door A",
			pricing: { "2-4 x 8-0": { price: 120 } },
		};
		const line = {
			uid: "line-1",
			formSteps: [
				{ step: { title: "Height" }, value: "6-8" },
				{ step: { title: "Door" }, meta: { selectedComponents: [component] } },
			],
			housePackageTool: {
				doors: [
					{ stepProductId: 1, dimension: "2-4 x 6-8", totalQty: 1 },
					{ stepProductId: 1, dimension: "2-4 x 7-0", totalQty: 2 },
				],
			},
		};

		expect(
			reconcileWorkflowHptRowsForHeightChange({
				line,
				nextSteps: [
					{ step: { title: "Height" }, value: "8-0" },
					line.formSteps[1],
				],
				availableDoorComponents: [component],
				profileCoefficient: 1,
			}),
		).toBeNull();
	});

	it("keeps quantities visible when a replacement size has no price", () => {
		const sourceRow = {
			id: 42,
			stepProductId: 1,
			dimension: "2-4 x 6-8",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			customPrice: 999,
			unitPrice: 999,
			lineTotal: 2_997,
			meta: { overridePrice: 999, customPrice: 999 },
		};
		const result = swapWorkflowHptDoorRowSize({
			line: {
				uid: "line-1",
				housePackageTool: { doors: [sourceRow] },
			},
			rows: [sourceRow],
			sourceRow,
			targetSize: "2-4 x 8-0",
			component: { id: 1, uid: "door-a", title: "Door A", pricing: {} },
			profileCoefficient: 1,
			sharedDoorSurcharge: 10,
			hasSwing: true,
		});

		const row = (result?.linePatch.housePackageTool as any)?.doors?.[0];
		expect(row).toMatchObject({
			dimension: "2-4 x 8-0",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			customPrice: null,
			unitPrice: 0,
			lineTotal: 0,
		});
		expect(row.meta).toMatchObject({
			priceMissing: true,
			pendingUnpricedSizeSwap: true,
			overridePrice: null,
			customPrice: null,
		});
		expect(result?.linePatch.qty).toBe(3);
		expect(result?.linePatch.lineTotal).toBe(0);
	});

	it("prevents a manual swap from duplicating a component-and-size row", () => {
		const sourceRow = {
			stepProductId: 1,
			dimension: "2-4 x 6-8",
			totalQty: 1,
		};
		const siblingRow = {
			stepProductId: 1,
			dimension: "2-4 x 8-0",
			totalQty: 1,
		};

		expect(
			swapWorkflowHptDoorRowSize({
				line: {
					uid: "line-1",
					housePackageTool: { doors: [sourceRow, siblingRow] },
				},
				rows: [sourceRow, siblingRow],
				sourceRow,
				targetSize: "2-4 x 8-0",
				component: { id: 1, pricing: { "2-4 x 8-0": 120 } },
				sharedDoorSurcharge: 0,
			}),
		).toBeNull();
	});

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
		expect(
			Object.keys((patch?.formSteps?.[0]?.meta || {}) as any),
		).not.toContain("0");
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
		expect(
			Object.keys((result?.linePatch.formSteps?.[0]?.meta || {}) as any),
		).not.toContain("0");
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
