import { describe, expect, it } from "bun:test";
import {
	buildWorkflowDoorRowsPatch,
	buildWorkflowDoorSizeVariantPatch,
	buildWorkflowMouldingRowsPatch,
	buildWorkflowServiceRowsContext,
	buildWorkflowServiceRowsPatch,
	buildWorkflowShelfSectionsPatch,
} from "./workflow-row-patches";

describe("workflow row patches", () => {
	it("builds moulding row persistence patches", () => {
		const patch = buildWorkflowMouldingRowsPatch({
			line: {
				uid: "line-1",
				meta: { keep: true },
			},
			sharedComponentPrice: 2,
			rows: [
				{
					uid: "moulding-1",
					qty: 3,
					estimateUnit: 4,
					lineTotal: 18,
				},
			],
		});

		expect((patch.meta as any).keep).toBe(true);
		expect((patch.meta as any).mouldingRows).toHaveLength(1);
		expect(patch.qty).toBe(3);
		expect(patch.lineTotal).toBe(6);
	});

	it("builds moulding patches with shared component, addon, and custom pricing", () => {
		const patch = buildWorkflowMouldingRowsPatch({
			line: {
				uid: "line-1",
				meta: {},
			},
			sharedComponentPrice: 5,
			rows: [
				{
					uid: "moulding-1",
					title: "Casing",
					qty: 2,
					salesPrice: 20,
					addon: 3,
				},
				{
					uid: "moulding-2",
					title: "Base",
					qty: 1,
					salesPrice: 10,
					customPrice: 40,
					addon: 2,
				},
			],
		});

		expect(patch.qty).toBe(3);
		expect(patch.lineTotal).toBe(98);
		expect(patch.unitPrice).toBe(32.67);
		expect((patch.meta as any).mouldingRows[0].lineTotal).toBe(56);
		expect((patch.meta as any).mouldingRows[1].lineTotal).toBe(42);
	});

	it("derives and persists service rows", () => {
		const line = {
			uid: "service-line",
			description: "Install",
			qty: 2,
			unitPrice: 30,
			meta: { taxxable: true, produceable: false },
		};
		const context = buildWorkflowServiceRowsContext(line);

		expect(context.rows).toHaveLength(1);
		expect(context.rows[0]?.service).toBe("Install");

		const patch = buildWorkflowServiceRowsPatch({
			line,
			rows: context.rows,
		});
		expect(patch.qty).toBe(2);
		expect(patch.lineTotal).toBe(60);
		expect(patch.description).toBe("Install");
		expect((patch.meta as any).taxxable).toBe(true);
	});

	it("persists multi-row service tax and production flags", () => {
		const patch = buildWorkflowServiceRowsPatch({
			line: {
				uid: "service-line",
				meta: {},
			},
			rows: [
				{
					uid: "svc-1",
					service: "Install",
					taxxable: false,
					produceable: true,
					qty: 2,
					unitPrice: 25,
				},
				{
					uid: "svc-2",
					service: "Cleanup",
					taxxable: true,
					produceable: false,
					qty: 1,
					unitPrice: 15,
				},
			],
		});

		expect(patch.qty).toBe(3);
		expect(patch.lineTotal).toBe(65);
		expect(patch.description).toBe("Install | Cleanup");
		expect((patch.meta as any).taxxable).toBe(true);
		expect((patch.meta as any).produceable).toBe(true);
		expect((patch.meta as any).serviceRows).toHaveLength(2);
	});

	it("builds shelf section patches", () => {
		const patch = buildWorkflowShelfSectionsPatch({
			sections: [
				{
					uid: "section-1",
					categoryIds: [],
					parentCategoryId: null,
					categoryId: null,
					subTotal: 0,
					rows: [
						{
							uid: "row-1",
							id: null,
							categoryId: null,
							productId: null,
							description: "Shelf",
							qty: 2,
							unitPrice: 11,
							totalPrice: 0,
						},
					],
				},
			],
		});

		expect(patch.flatRows).toHaveLength(1);
		expect(patch.qty).toBe(2);
		expect(patch.lineTotal).toBe(0);
		expect((patch.linePatch as any).shelfItems).toHaveLength(1);
	});

	it("builds HPT row patches with shared surcharge", () => {
		const patch = buildWorkflowDoorRowsPatch({
			line: {
				uid: "door-line",
				qty: 1,
				lineTotal: 1,
				housePackageTool: { id: null },
			},
			sharedDoorSurcharge: 5,
			rows: [
				{
					stepProductId: 10,
					dimension: "24 x 80",
					lhQty: 1,
					rhQty: 1,
					totalQty: 2,
					unitPrice: 20,
					lineTotal: 0,
					meta: {
						baseUnitPrice: 20,
					},
				},
			],
		});

		expect(patch.totalDoors).toBe(2);
		expect(patch.totalPrice).toBe(50);
		expect((patch.linePatch as any).housePackageTool.doors[0].unitPrice).toBe(
			25,
		);
	});

	it("builds door size variant patches for one component", () => {
		const patch = buildWorkflowDoorSizeVariantPatch({
			line: {
				uid: "door-line",
				qty: 1,
				lineTotal: 1,
				housePackageTool: {
					id: null,
					doors: [
						{
							stepProductId: 9,
							totalQty: 1,
							unitPrice: 7,
							lineTotal: 7,
						},
						{
							stepProductId: 10,
							totalQty: 1,
							unitPrice: 3,
							lineTotal: 3,
						},
					],
				},
			},
			componentId: 10,
			rows: [
				{
					totalQty: 2,
					unitPrice: 4,
					lineTotal: 0,
				},
			],
		});

		expect(patch.doors).toHaveLength(2);
		expect(patch.totalDoors).toBe(3);
		expect(patch.totalPrice).toBe(15);
		expect(patch.doors[1]?.stepProductId).toBe(10);
	});

	it("does not persist selected door rows without a price", () => {
		const patch = buildWorkflowDoorSizeVariantPatch({
			line: {
				uid: "door-line",
				qty: 1,
				lineTotal: 7,
				housePackageTool: {
					id: null,
					doors: [
						{
							stepProductId: 9,
							totalQty: 1,
							unitPrice: 7,
							lineTotal: 7,
						},
					],
				},
			},
			componentId: 10,
			rows: [
				{
					stepProductId: 10,
					dimension: "2-0 x 6-8",
					lhQty: 1,
					totalQty: 1,
					unitPrice: 0,
					lineTotal: 0,
					meta: {
						baseUnitPrice: 0,
						priceMissing: true,
					},
				},
				{
					stepProductId: 10,
					dimension: "2-4 x 6-8",
					rhQty: 1,
					totalQty: 1,
					unitPrice: 12,
					lineTotal: 12,
					meta: {
						baseUnitPrice: 12,
						priceMissing: false,
					},
				},
			],
		});

		expect(patch.doors).toHaveLength(2);
		expect(patch.doors.some((door) => door.dimension === "2-0 x 6-8")).toBe(
			false,
		);
		expect(patch.totalDoors).toBe(2);
		expect(patch.totalPrice).toBe(19);
	});
});
