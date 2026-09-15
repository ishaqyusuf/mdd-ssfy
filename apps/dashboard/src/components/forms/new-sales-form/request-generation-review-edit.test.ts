import { expect, test } from "bun:test";
import { resolveSalesRequestDoorProduct } from "./request-generation-review-edit";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";

const preview = {
	generationId: "test",
	seed: {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "slabs",
				qty: 14,
				formSteps: [{ stepId: 1, prodUid: "slab-route" }],
				housePackageTool: {
					doors: [
						{ dimension: "2-10 x 6-8", totalQty: 11 },
						{ dimension: "3-0 x 6-8", totalQty: 2 },
						{ dimension: "2-4 x 6-8", totalQty: 1 },
					],
				},
			},
		],
		unresolved: [
			{
				lineUid: "slabs",
				stepId: 51,
				field: "Door",
				status: "unsupported",
				reason: "Exact product missing",
			},
			{
				lineUid: "slabs",
				stepId: null,
				field: "delivery",
				status: "ambiguous",
				reason: "Delivery date missing",
			},
		],
	},
} as SalesRequestGeneratePreviewOutput;

test("explicit Door Type review uses scalar selection and preserves Door uncertainty and sizes", () => {
	const source = structuredClone(preview);
	source.seed.unresolved.push({
		lineUid: "slabs",
		stepId: 50,
		field: "doorType",
		status: "unsupported",
		reason: "Exact type missing",
	});
	const next = resolveSalesRequestDoorProduct(source, {
		lineUid: "slabs",
		stepId: 50,
		componentUid: "solid-core",
		field: "doorType",
	});
	expect(next.seed.lineItems[0]?.formSteps.at(-1)).toEqual({
		stepId: 50,
		prodUid: "solid-core",
	});
	expect(next.seed.unresolved).toEqual(preview.seed.unresolved);
	expect(next.seed.lineItems[0]?.housePackageTool).toEqual(
		preview.seed.lineItems[0]?.housePackageTool,
	);
	expect(next.userReviewed).toBe(true);
});

test("reviewer resolves only the chosen Door and preserves every size and other uncertainty", () => {
	const original = structuredClone(preview);
	const next = resolveSalesRequestDoorProduct(preview, {
		lineUid: "slabs",
		stepId: 51,
		componentUid: "chosen-door",
	});
	expect(next.seed.lineItems[0]?.housePackageTool).toEqual(
		preview.seed.lineItems[0]?.housePackageTool,
	);
	expect(next.seed.lineItems[0]?.qty).toBe(14);
	expect(next.seed.lineItems[0]?.formSteps[1]).toEqual({
		stepId: 51,
		meta: { selectedProdUids: ["chosen-door"] },
	});
	expect(next.seed.unresolved).toEqual([preview.seed.unresolved[1]!]);
	expect(next.userReviewed).toBe(true);
	expect(preview).toEqual(original);
});

test("reviewer can replace a product rejected by native validation without regenerating", () => {
	const first = resolveSalesRequestDoorProduct(preview, {
		lineUid: "slabs",
		stepId: 51,
		componentUid: "first",
	});
	const next = resolveSalesRequestDoorProduct(first, {
		lineUid: "slabs",
		stepId: 51,
		componentUid: "replacement",
		replaceExisting: true,
	});
	expect(
		next.seed.lineItems[0]?.formSteps.filter((step) => step.stepId === 51),
	).toEqual([{ stepId: 51, meta: { selectedProdUids: ["replacement"] } }]);
	expect(next.seed.lineItems[0]?.housePackageTool).toEqual(
		first.seed.lineItems[0]?.housePackageTool,
	);
	expect(next.seed.unresolved).toEqual(first.seed.unresolved);
	expect(() =>
		resolveSalesRequestDoorProduct(first, {
			lineUid: "slabs",
			stepId: 999,
			componentUid: "replacement",
			replaceExisting: true,
		}),
	).toThrow();
});

test("rejects stale or unrelated review targets", () => {
	expect(() =>
		resolveSalesRequestDoorProduct(preview, {
			lineUid: "other",
			stepId: 51,
			componentUid: "chosen",
		}),
	).toThrow();
	expect(() =>
		resolveSalesRequestDoorProduct(preview, {
			lineUid: "slabs",
			stepId: 13,
			componentUid: "chosen",
		}),
	).toThrow();
});
