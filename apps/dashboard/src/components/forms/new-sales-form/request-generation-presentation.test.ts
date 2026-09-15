import { describe, expect, test } from "bun:test";
import {
	type SalesRequestReviewRouteData,
	buildSalesRequestReviewModel,
} from "./request-generation-presentation";
import type { NewSalesFormStepRouting } from "./schema";

const routeData = {
	settingsMeta: {
		route: {
			"root-door": {
				requestGeneration: {
					defaults: { "door-size": "size-6-8" },
				},
			},
		},
	},
	stepsById: { 1: "root-step", 2: "door-size", 3: "door-style" },
	stepsByUid: {
		"root-step": {
			uid: "root-step",
			title: "Item Type",
			components: [
				{ uid: "root-door", title: "Interior Doors" },
				{ uid: "root-mouldings", title: "Mouldings" },
				{ uid: "root-services", title: "Services" },
			],
		},
		"door-size": {
			uid: "door-size",
			title: "Door Size",
			components: [{ uid: "size-6-8", title: "6-8" }],
		},
		"door-style": {
			uid: "door-style",
			title: "Door Style",
			components: [{ uid: "style-slab", title: "Smooth Slab" }],
		},
	},
	composedRouter: {},
} as unknown as SalesRequestReviewRouteData & NewSalesFormStepRouting;

test("presents authoritative line, HPT, moulding, service, delivery, and custom values", () => {
	const model = buildSalesRequestReviewModel(
		{
			seed: {
				schemaVersion: 2,
				lineItems: [
					{
						uid: "line-1",
						qty: 3,
						formSteps: [
							{ stepId: 1, prodUid: "root-door" },
							{ stepId: 3, prodUid: "style-slab" },
							{ stepId: 4, value: "Brushed nickel" },
						],
						housePackageTool: {
							doors: [
								{ dimension: "3-0 x 6-8", totalQty: 2 },
								{ dimension: "2-10 x 6-8", lhQty: 1, rhQty: 0 },
							],
						},
					},
					{
						uid: "line-2",
						qty: 4,
						formSteps: [{ stepId: 1, prodUid: "root-mouldings" }],
						meta: {
							mouldingRows: [{ uid: "size-6-8", qty: 4 }],
						},
					},
					{
						uid: "line-3",
						qty: 2,
						formSteps: [{ stepId: 1, prodUid: "root-services" }],
						meta: {
							serviceRows: [{ uid: "service-1", service: "Install", qty: 2 }],
						},
					},
				],
				form: { deliveryOption: "delivery" },
				extraCosts: [
					{ id: null, label: "Delivery", type: "Delivery", amount: 125 },
				],
				unresolved: [],
			},
		},
		routeData,
	);

	expect(model.lines[0]).toMatchObject({
		quantity: 3,
		selections: [
			{ stepTitle: "Item Type", values: ["Interior Doors"] },
			{ stepTitle: "Door Style", values: ["Smooth Slab"] },
			{ stepTitle: "Step 4", values: ["Brushed nickel"], kind: "custom" },
		],
		hptRows: [
			{ dimension: "3-0 x 6-8", quantity: 2 },
			{ dimension: "2-10 x 6-8", quantity: 1, handed: "LH 1 · RH 0" },
		],
	});
	expect(model.lines[1]?.mouldingRows).toEqual([
		{ title: "6-8", quantity: 4, calculation: null },
	]);
	expect(model.lines[2]?.serviceRows).toEqual([
		{ service: "Install", quantity: 2 },
	]);
	expect(model.delivery).toEqual({ option: "delivery", amount: 125 });
});

test("separates unresolved blockers, warnings, and omitted configured defaults", () => {
	const model = buildSalesRequestReviewModel(
		{
			seed: {
				schemaVersion: 2,
				lineItems: [
					{
						uid: "line-1",
						qty: 1,
						formSteps: [{ stepId: 1, prodUid: "root-door" }],
					},
				],
				unresolved: [
					{
						lineUid: "line-1",
						stepId: 3,
						field: "Door style",
						status: "ambiguous",
						reason: "The request names two possible styles.",
					},
				],
			},
		},
		routeData,
	);

	expect(model.unresolved).toEqual([
		{
			lineLabel: "Line 1",
			stepLabel: "Door Style",
			field: "Door style",
			status: "ambiguous",
			reason: "The request names two possible styles.",
		},
	]);
	expect(model.defaults).toEqual([
		{
			lineLabel: "Line 1",
			stepLabel: "Door Size",
			value: "6-8",
		},
	]);
	expect(model.warnings).toEqual([]);
});

test("does not invent a title when authoritative catalog data is missing", () => {
	const model = buildSalesRequestReviewModel(
		{
			seed: {
				schemaVersion: 2,
				lineItems: [
					{
						uid: "line-1",
						qty: 1,
						formSteps: [{ stepId: 99, prodUid: "unknown-component" }],
					},
				],
				unresolved: [],
			},
		},
		routeData,
	);

	expect(model.lines[0]?.selections[0]?.values).toEqual([
		"Unknown component (unknown-component)",
	]);
	expect(model.warnings).toEqual([
		{
			lineLabel: "Line 1",
			stepLabel: "Step 99",
			detail:
				"The current catalog did not provide an authoritative title for unknown-component.",
		},
	]);
});

// Regression from the live DeepSeek slab output: there is deliberately no Door selection.
test("retains every slab size and the missing-product warning without route data", () => {
	const model = buildSalesRequestReviewModel(
		{
			schemaVersion: 2,
			lineItems: [
				{
					uid: "line-1",
					qty: 14,
					formSteps: [
						{ stepId: 1, prodUid: "2oWEo" },
						{ stepId: 13, prodUid: "D2Vup" },
						{ stepId: 41, prodUid: "owVLr" },
					],
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
					lineUid: "line-1",
					stepId: 51,
					field: "door",
					status: "unsupported",
					reason:
						"No listed Door product matches the requested properties: smooth, white-primed, engineered solid-core interior door slabs.",
				},
			],
		},
		null,
	);
	expect(model.lines[0]?.quantity).toBe(14);
	expect(
		model.lines[0]?.hptRows.map(({ dimension, quantity }) => ({
			dimension,
			quantity,
		})),
	).toEqual([
		{ dimension: "2-10 x 6-8", quantity: 11 },
		{ dimension: "3-0 x 6-8", quantity: 2 },
		{ dimension: "2-4 x 6-8", quantity: 1 },
	]);
	expect(model.unresolved[0]?.reason).toContain("engineered solid-core");
	expect(model.defaults).toEqual([]);
});
