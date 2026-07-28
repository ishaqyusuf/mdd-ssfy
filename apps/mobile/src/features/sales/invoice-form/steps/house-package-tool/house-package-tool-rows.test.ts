import { describe, expect, it } from "bun:test";
import type {
	DoorStoredRow,
	WorkflowComponentRecord,
} from "@gnd/sales/sales-form-core";
import {
	buildDoorGroups,
	canRemoveHousePackageDoorOption,
	createHousePackageDoorRow,
	createHousePackageAvailableDoorSizeRow,
} from "./house-package-tool-rows";

describe("house package tool row groups", () => {
	it("shows a selected door group before it has size rows", () => {
		const groups = buildDoorGroups([], [
			{
				id: 12,
				uid: "door-modern",
				title: "Modern Slab",
			} as WorkflowComponentRecord,
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({
			key: "component:12",
			title: "MODERN SLAB",
			totalQty: 0,
			totalPrice: 0,
		});
		expect(groups[0]?.rows).toEqual([]);
	});

	it("uses a human value for selected door groups with uid-like titles", () => {
		const groups = buildDoorGroups([], [
			{
				id: 12,
				uid: "workflow-door-package",
				title: "workflow-door-package",
				value: "Modern Slab",
			} as WorkflowComponentRecord,
		]);

		expect(groups[0]?.title).toBe("MODERN SLAB");
	});

	it("attaches persisted size rows to their selected door group", () => {
		const rows = [
			{
				stepProductId: 12,
				dimension: "2-8 x 8-0",
				totalQty: 3,
				lineTotal: 450,
			},
		] as DoorStoredRow[];

		const groups = buildDoorGroups(rows, [
			{
				id: 12,
				uid: "door-modern",
				title: "Modern Slab",
			} as WorkflowComponentRecord,
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0]?.key).toBe("component:12");
		expect(groups[0]?.totalQty).toBe(3);
		expect(groups[0]?.totalPrice).toBe(450);
		expect(groups[0]?.rows[0]?.row.dimension).toBe("2-8 x 8-0");
	});

	it("attaches persisted size rows by component uid when no product id is available", () => {
		const rows = [
			{
				stepProductId: null,
				dimension: "3-0 x 8-0",
				totalQty: 2,
				lineTotal: 300,
				meta: {
					componentUid: "door-imported",
					componentTitle: "Imported Door",
				},
			},
		] as DoorStoredRow[];

		const groups = buildDoorGroups(rows, [
			{
				id: null,
				uid: "door-imported",
				title: "Imported Door",
			} as WorkflowComponentRecord,
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({
			key: "selected:door-imported",
			title: "IMPORTED DOOR",
			totalQty: 2,
			totalPrice: 300,
		});
		expect(groups[0]?.rows[0]?.row.dimension).toBe("3-0 x 8-0");
	});

	it("attaches persisted size rows by component uid from JSON metadata", () => {
		const rows = [
			{
				stepProductId: null,
				dimension: "3-0 x 8-0",
				totalQty: 2,
				lineTotal: 300,
				meta: JSON.stringify({
					componentUid: "door-imported",
					componentTitle: "Imported Door",
				}),
			},
		] as unknown as DoorStoredRow[];

		const groups = buildDoorGroups(rows, [
			{
				id: null,
				uid: "door-imported",
				title: "Imported Door",
			} as WorkflowComponentRecord,
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({
			key: "selected:door-imported",
			title: "IMPORTED DOOR",
			totalQty: 2,
			totalPrice: 300,
		});
		expect(groups[0]?.rows[0]?.row.dimension).toBe("3-0 x 8-0");
	});

	it("keeps manual saved rows when no selected door owns them", () => {
		const groups = buildDoorGroups(
			[
				{
					dimension: "3-0 x 8-0",
					totalQty: 1,
					lineTotal: 125,
					meta: {
						componentTitle: "Legacy Door",
					},
				},
			] as DoorStoredRow[],
			[],
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({
			key: "manual",
			title: "LEGACY DOOR",
			totalQty: 1,
			totalPrice: 125,
		});
	});

	it("shows unowned saved size rows under the only selected door", () => {
		const groups = buildDoorGroups(
			[
				{
					dimension: "2-8 x 8-0",
					totalQty: 2,
					lineTotal: 300,
				},
			] as DoorStoredRow[],
			[
				{
					id: 12,
					uid: "door-modern",
					title: "Modern Slab",
				} as WorkflowComponentRecord,
			],
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({
			key: "component:12",
			title: "MODERN SLAB",
			totalQty: 2,
			totalPrice: 300,
		});
		expect(groups[0]?.rows[0]?.row.dimension).toBe("2-8 x 8-0");
	});

	it("falls back to a neutral door label for persisted uid-like group titles", () => {
		const groups = buildDoorGroups(
			[
				{
					dimension: "3-0 x 8-0",
					totalQty: 1,
					lineTotal: 125,
					meta: JSON.stringify({
						componentTitle: "workflow-door-package",
					}),
				},
			] as unknown as DoorStoredRow[],
			[],
		);

		expect(groups[0]?.title).toBe("DOOR");
	});

	it("creates quick available-size rows with component metadata", () => {
		const row = createHousePackageAvailableDoorSizeRow({
			component: {
				id: 12,
				uid: "door-modern",
				title: "Modern Slab",
				pricing: {
					"2-8 x 8-0": {
						basePrice: 100,
						salesPrice: 150,
					},
				},
			} as WorkflowComponentRecord,
			size: "2-8 x 8-0",
			supplierMeta: { supplierUid: null },
			sharedDoorSurcharge: 25,
			salesMultiplier: 1,
		});

		expect(row).toMatchObject({
			dimension: "2-8 x 8-0",
			stepProductId: 12,
			jambSizePrice: 100,
			unitPrice: 125,
			meta: {
				baseUnitPrice: 100,
				doorSalesUnitPrice: 100,
				sharedDoorSurcharge: 25,
				priceMissing: false,
				componentUid: "door-modern",
				componentTitle: "Modern Slab",
			},
		});
	});

	it("stores a human component title for quick available-size rows with uid-like titles", () => {
		const row = createHousePackageAvailableDoorSizeRow({
			component: {
				id: 12,
				uid: "workflow-door-package",
				title: "workflow-door-package",
				value: "Modern Slab",
				pricing: {
					"2-8 x 8-0": {
						basePrice: 100,
						salesPrice: 150,
					},
				},
			} as WorkflowComponentRecord,
			size: "2-8 x 8-0",
			supplierMeta: { supplierUid: null },
			sharedDoorSurcharge: 25,
			salesMultiplier: 1,
		});

		expect(row.meta).toMatchObject({
			componentTitle: "Modern Slab",
		});
	});

	it("stores a human component title for created HPT size rows with uid-like titles", () => {
		const row = createHousePackageDoorRow({
			id: 12,
			uid: "workflow-door-package",
			title: "workflow-door-package",
			value: "Modern Slab",
			basePrice: 100,
			salesPrice: 150,
		} as WorkflowComponentRecord);

		expect(row.meta).toMatchObject({
			componentTitle: "Modern Slab",
		});
	});

	it("does not allow removing the final selected HPT door option", () => {
		expect(
			canRemoveHousePackageDoorOption({
				selectedDoors: [
					{
						id: 12,
						uid: "door-modern",
					} as WorkflowComponentRecord,
				],
				hasRemoveHandler: true,
			}),
		).toBe(false);
		expect(
			canRemoveHousePackageDoorOption({
				selectedDoors: [
					{
						id: 12,
						uid: "door-modern",
					} as WorkflowComponentRecord,
					{
						id: 13,
						uid: "door-panel",
					} as WorkflowComponentRecord,
				],
				hasRemoveHandler: true,
			}),
		).toBe(true);
	});

	it("keeps HPT door option removal disabled without a handler or when editor is disabled", () => {
		const selectedDoors = [
			{
				id: 12,
				uid: "door-modern",
			} as WorkflowComponentRecord,
			{
				id: 13,
				uid: "door-panel",
			} as WorkflowComponentRecord,
		];

		expect(
			canRemoveHousePackageDoorOption({
				selectedDoors,
				hasRemoveHandler: false,
			}),
		).toBe(false);
		expect(
			canRemoveHousePackageDoorOption({
				selectedDoors,
				disabled: true,
				hasRemoveHandler: true,
			}),
		).toBe(false);
	});
});
