import { expect, test } from "bun:test";
import {
	NEW_SALES_FORM_SEED_EXAMPLE,
	newSalesFormSeedSchema,
} from "./new-sales-form-seed";

test("accepts the fictional native new-sales-form seed example", () => {
	expect(newSalesFormSeedSchema.parse(NEW_SALES_FORM_SEED_EXAMPLE)).toEqual(
		NEW_SALES_FORM_SEED_EXAMPLE,
	);
});

test("accepts the repository-safe real-order example without translation", async () => {
	const exampleUrl = new URL(
		"../../../../../.brain/analysis/sales-request-ai-output-example.json",
		import.meta.url,
	);
	const example = await Bun.file(exampleUrl).json();
	expect(newSalesFormSeedSchema.parse(example)).toEqual(example);
});

test("accepts the v2 native custom, service, and delivery paths", () => {
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "service-line",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "services" },
					{ stepId: 2, value: "Customer supplied finish" },
				],
				meta: {
					serviceRows: [
						{ uid: "service-1", service: "Field installation", qty: 2 },
					],
				},
			},
		],
		form: { deliveryOption: "delivery" },
		extraCosts: [
			{ id: null, label: "Delivery", type: "Delivery", amount: 125 },
		],
		unresolved: [],
	} as const;

	expect(newSalesFormSeedSchema.parse(seed)).toEqual(seed);
});

test("keeps schemaVersion 1 readable but does not backport v2 fields", () => {
	const v1 = {
		...NEW_SALES_FORM_SEED_EXAMPLE,
		schemaVersion: 1 as const,
	};
	expect(newSalesFormSeedSchema.safeParse(v1).success).toBe(true);
	expect(
		newSalesFormSeedSchema.safeParse({
			...v1,
			form: { deliveryOption: "pickup" },
		}).success,
	).toBe(false);
	expect(
		newSalesFormSeedSchema.safeParse({
			...v1,
			lineItems: [
				{
					...v1.lineItems[0],
					formSteps: [{ stepId: 2, value: "Custom" }],
				},
			],
		}).success,
	).toBe(false);
});

test("keeps service rows price-free and uniquely identified", () => {
	const line = NEW_SALES_FORM_SEED_EXAMPLE.lineItems[0];
	for (const serviceRows of [
		[
			{
				uid: "service-1",
				service: "Install",
				qty: 1,
				unitPrice: 50,
			},
		],
		[
			{
				uid: "service-1",
				service: "Install",
				qty: 1,
				taxxable: true,
			},
		],
		[
			{ uid: "service-1", service: "Install", qty: 1 },
			{ uid: "service-1", service: "Cleanup", qty: 1 },
		],
	]) {
		expect(
			newSalesFormSeedSchema.safeParse({
				...NEW_SALES_FORM_SEED_EXAMPLE,
				lineItems: [{ ...line, meta: { serviceRows } }],
			}).success,
		).toBe(false);
	}
});

test("allows only one exact native Delivery cost on delivery fulfillment", () => {
	const delivery = {
		id: null,
		label: "Delivery",
		type: "Delivery",
		amount: 25,
	} as const;
	expect(
		newSalesFormSeedSchema.safeParse({
			...NEW_SALES_FORM_SEED_EXAMPLE,
			form: { deliveryOption: "delivery" },
			extraCosts: [delivery],
		}).success,
	).toBe(true);

	for (const invalid of [
		{
			...NEW_SALES_FORM_SEED_EXAMPLE,
			form: { deliveryOption: "pickup" },
			extraCosts: [delivery],
		},
		{
			...NEW_SALES_FORM_SEED_EXAMPLE,
			form: { deliveryOption: "delivery" },
			extraCosts: [delivery, delivery],
		},
		{
			...NEW_SALES_FORM_SEED_EXAMPLE,
			form: { deliveryOption: "delivery" },
			extraCosts: [{ ...delivery, taxxable: false }],
		},
		{
			...NEW_SALES_FORM_SEED_EXAMPLE,
			form: { deliveryOption: "delivery" },
			extraCosts: [{ ...delivery, type: "Labor" }],
		},
	]) {
		expect(newSalesFormSeedSchema.safeParse(invalid).success).toBe(false);
	}
});

test("requires at least one line or unresolved entry", () => {
	expect(
		newSalesFormSeedSchema.safeParse({
			schemaVersion: 1,
			lineItems: [],
			unresolved: [
				{
					lineUid: null,
					stepId: null,
					field: "request",
					status: "unsupported",
					reason: "No configured item route matches the request",
				},
			],
		}).success,
	).toBe(true);
	expect(
		newSalesFormSeedSchema.safeParse({
			schemaVersion: 1,
			lineItems: [],
			unresolved: [],
		}).success,
	).toBe(false);
});

test("rejects hydrated snapshots, persisted identities, and pricing fields", () => {
	for (const injected of [
		{ ...NEW_SALES_FORM_SEED_EXAMPLE, total: 999 },
		{
			...NEW_SALES_FORM_SEED_EXAMPLE,
			lineItems: [
				{
					...NEW_SALES_FORM_SEED_EXAMPLE.lineItems[0],
					id: 42,
				},
			],
		},
		{
			...NEW_SALES_FORM_SEED_EXAMPLE,
			lineItems: [
				{
					...NEW_SALES_FORM_SEED_EXAMPLE.lineItems[0],
					formSteps: [
						{
							stepId: 20,
							meta: {
								selectedProdUids: ["smooth-panel"],
								selectedComponents: [],
							},
						},
					],
				},
			],
		},
	]) {
		expect(newSalesFormSeedSchema.safeParse(injected).success).toBe(false);
	}
});

test("rejects duplicate line, step, and multi-select identities", () => {
	const line = NEW_SALES_FORM_SEED_EXAMPLE.lineItems[0];
	expect(
		newSalesFormSeedSchema.safeParse({
			...NEW_SALES_FORM_SEED_EXAMPLE,
			lineItems: [line, line],
		}).success,
	).toBe(false);
	expect(
		newSalesFormSeedSchema.safeParse({
			...NEW_SALES_FORM_SEED_EXAMPLE,
			lineItems: [
				{ ...line, formSteps: [line.formSteps[0], line.formSteps[0]] },
			],
		}).success,
	).toBe(false);
	expect(
		newSalesFormSeedSchema.safeParse({
			...NEW_SALES_FORM_SEED_EXAMPLE,
			lineItems: [
				{
					...line,
					formSteps: [
						{
							stepId: 20,
							meta: { selectedProdUids: ["one", "one"] },
						},
					],
				},
			],
		}).success,
	).toBe(false);
});

test("rejects unresolved references to unknown or already-selected form steps", () => {
	const line = NEW_SALES_FORM_SEED_EXAMPLE.lineItems[0];
	for (const unresolved of [
		{
			lineUid: "missing-line",
			stepId: null,
			field: "itemType",
			status: "unsupported",
			reason: "No configured route",
		},
		{
			lineUid: line.uid,
			stepId: line.formSteps[0].stepId,
			field: "selection",
			status: "ambiguous",
			reason: "Two candidates",
		},
	]) {
		expect(
			newSalesFormSeedSchema.safeParse({
				...NEW_SALES_FORM_SEED_EXAMPLE,
				unresolved: [unresolved],
			}).success,
		).toBe(false);
	}
});

test("requires global unresolved entries to leave both line and step unspecified", () => {
	expect(
		newSalesFormSeedSchema.safeParse({
			...NEW_SALES_FORM_SEED_EXAMPLE,
			unresolved: [
				{
					lineUid: null,
					stepId: 999,
					field: "frame",
					status: "unreadable",
					reason: "The screenshot does not show which line owns this frame",
				},
			],
		}).success,
	).toBe(false);
});

test("rejects an HPT door row with no handed quantity", () => {
	const seed = structuredClone(NEW_SALES_FORM_SEED_EXAMPLE);
	const door = seed.lineItems[0]?.housePackageTool?.doors[0];
	if (!door) throw new Error("Expected seed fixture door");
	door.lhQty = 0;
	door.rhQty = 0;
	expect(newSalesFormSeedSchema.safeParse(seed).success).toBe(false);
});
