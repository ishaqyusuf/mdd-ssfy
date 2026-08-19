import { describe, expect, it } from "bun:test";
import {
	hasNewerSalesFormPayload,
	mergeCanonicalSalesFormIds,
	rebaseQueuedSalesFormPayload,
} from "./auto-save-payload";
import type { NewSalesFormSaveDraftInput } from "./schema";

describe("new sales form queued autosave payload", () => {
	it("rebases a queued new-draft edit onto the first created order", () => {
		const queued: NewSalesFormSaveDraftInput = {
			type: "order" as const,
			salesId: null,
			slug: null,
			version: "new-autosave-session-1",
			autosave: true,
			meta: { po: "AUTOSAVE-B" },
			lineItems: [],
			extraCosts: [],
			summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
		};

		const rebased = rebaseQueuedSalesFormPayload(queued, {
			salesId: 42,
			slug: "order-00042aa",
			version: "saved-version-1",
		});

		expect(rebased).toMatchObject({
			salesId: 42,
			slug: "order-00042aa",
			version: "saved-version-1",
			meta: { po: "AUTOSAVE-B" },
		});
	});

	it("detects a newer edit without treating saved identity changes as edits", () => {
		const saved: NewSalesFormSaveDraftInput = {
			type: "order" as const,
			salesId: null,
			slug: null,
			version: "new-autosave-session-1",
			autosave: true,
			meta: { po: "AUTOSAVE-A" },
			lineItems: [],
			extraCosts: [],
			summary: {
				subTotal: 0,
				taxRate: 0,
				taxTotal: 0,
				grandTotal: 0,
			},
		};

		expect(
			hasNewerSalesFormPayload(
				{
					...saved,
					salesId: 42,
					slug: "order-00042aa",
					version: "v2",
				},
				saved,
			),
		).toBe(false);
		expect(
			hasNewerSalesFormPayload({ ...saved, meta: { po: "AUTOSAVE-B" } }, saved),
		).toBe(true);
	});

	it("rebases durable nested ids without replacing newer commercial values", () => {
		const [line] = mergeCanonicalSalesFormIds(
			[
				{
					id: null,
					uid: "garage-door",
					title: "Garage Door",
					description: "",
					qty: 1,
					unitPrice: 360,
					lineTotal: 360,
					meta: {},
					formSteps: [],
					shelfItems: [],
					housePackageTool: {
						id: null,
						doors: [
							{
								id: null,
								stepProductId: 1322,
								dimension: "2-6 x 6-8",
								totalQty: 1,
								unitPrice: 360,
								lineTotal: 360,
							},
						],
					},
				},
			] as any,
			[
				{
					id: 170429,
					uid: "garage-door",
					housePackageTool: {
						id: 500,
						doors: [
							{
								id: 63943,
								stepProductId: 1322,
								dimension: "2-6 X 6-8",
								unitPrice: 355.67,
							},
						],
					},
				},
			] as any,
		);

		expect(line).toMatchObject({
			id: 170429,
			unitPrice: 360,
			housePackageTool: {
				id: 500,
				doors: [{ id: 63943, unitPrice: 360 }],
			},
		});
	});

	it("never assigns saved ids by position after a concurrent insert or reorder", () => {
		const lines = mergeCanonicalSalesFormIds(
			[
				{ id: null, uid: "new-line", formSteps: [], shelfItems: [] },
				{ id: null, uid: "saved-line", formSteps: [], shelfItems: [] },
			] as any,
			[{ id: 91, uid: "saved-line", formSteps: [], shelfItems: [] }] as any,
		);

		expect(lines[0]?.id).toBeNull();
		expect(lines[1]?.id).toBe(91);
	});

	it("does not reuse one canonical id for ambiguous repeated siblings", () => {
		const [line] = mergeCanonicalSalesFormIds(
			[
				{
					uid: "shelf-line",
					formSteps: [],
					shelfItems: [
						{ id: null, categoryId: 2, productId: 8 },
						{ id: null, categoryId: 2, productId: 8 },
					],
				},
			] as any,
			[
				{
					id: 10,
					uid: "shelf-line",
					formSteps: [],
					shelfItems: [{ id: 21, categoryId: 2, productId: 8 }],
				},
			] as any,
		);

		expect(line?.shelfItems?.map((row) => row.id)).toEqual([null, null]);
	});

	it("matches door identities by component uid when no product id exists", () => {
		const [line] = mergeCanonicalSalesFormIds(
			[
				{
					uid: "custom-door",
					formSteps: [],
					shelfItems: [],
					housePackageTool: {
						doors: [
							{
								id: null,
								dimension: "2-6 x 6-8",
								meta: { componentUid: "custom-shaker" },
							},
						],
					},
				},
			] as any,
			[
				{
					id: 10,
					uid: "custom-door",
					formSteps: [],
					shelfItems: [],
					housePackageTool: {
						id: 20,
						doors: [
							{
								id: 30,
								dimension: "2-6 X 6-8",
								meta: { componentUid: "CUSTOM-SHAKER" },
							},
						],
					},
				},
			] as any,
		);

		expect(line?.housePackageTool?.doors?.[0]?.id).toBe(30);
	});
});
