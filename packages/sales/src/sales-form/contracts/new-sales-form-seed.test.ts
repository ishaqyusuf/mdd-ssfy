import { expect, test } from "bun:test";
import {
	NEW_SALES_FORM_MOULDING_SEED_EXAMPLE,
	NEW_SALES_FORM_SEED_EXAMPLE,
	newSalesFormSeedSchema,
} from "./new-sales-form-seed";

test("accepts the fictional native new-sales-form seed example", () => {
	expect(newSalesFormSeedSchema.parse(NEW_SALES_FORM_SEED_EXAMPLE)).toEqual(
		NEW_SALES_FORM_SEED_EXAMPLE,
	);
});

test("accepts the fictional mixed moulding quantity example", () => {
	expect(
		newSalesFormSeedSchema.parse(NEW_SALES_FORM_MOULDING_SEED_EXAMPLE),
	).toEqual(NEW_SALES_FORM_MOULDING_SEED_EXAMPLE);
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

test("accepts native moulding rows with one quantity per selected component", () => {
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "moulding-line",
				qty: 61,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{
						stepId: 215,
						meta: {
							selectedProdUids: ["baseboard", "casing", "crown"],
						},
					},
				],
				meta: {
					mouldingRows: [
						{ uid: "baseboard", qty: 24 },
						{ uid: "casing", qty: 36 },
						{ uid: "crown", qty: 1 },
					],
				},
			},
		],
		unresolved: [],
	} as const;

	expect(newSalesFormSeedSchema.parse(seed)).toEqual(seed);
});

test("accepts a transient moulding linear-foot calculation before normalization", () => {
	const seed = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "moulding-line",
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{
						stepId: 215,
						meta: { selectedProdUids: ["baseboard-16"] },
					},
				],
				meta: {
					mouldingRows: [
						{
							uid: "baseboard-16",
							calculation: {
								linearFeet: 400,
								pieceLength: 16,
								wastePercentage: 10,
							},
						},
					],
				},
			},
		],
		unresolved: [],
	} as const;

	expect(newSalesFormSeedSchema.parse(seed)).toEqual(seed);
});

test("keeps moulding rows price-free, uniquely identified, and quantity-consistent", () => {
	const base = {
		schemaVersion: 2,
		lineItems: [
			{
				uid: "moulding-line",
				qty: 2,
				formSteps: [
					{ stepId: 1, prodUid: "mouldings" },
					{
						stepId: 215,
						meta: { selectedProdUids: ["baseboard"] },
					},
				],
				meta: { mouldingRows: [{ uid: "baseboard", qty: 2 }] },
			},
		],
		unresolved: [],
	};

	for (const mouldingRows of [
		[{ uid: "baseboard", qty: 2, unitPrice: 50 }],
		[
			{ uid: "baseboard", qty: 1 },
			{ uid: "baseboard", qty: 1 },
		],
	]) {
		expect(
			newSalesFormSeedSchema.safeParse({
				...base,
				lineItems: [{ ...base.lineItems[0], meta: { mouldingRows } }],
			}).success,
		).toBe(false);
	}

	expect(
		newSalesFormSeedSchema.safeParse({
			...base,
			lineItems: [{ ...base.lineItems[0], qty: 3 }],
		}).success,
	).toBe(false);
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
	const seed = structuredClone(NEW_SALES_FORM_SEED_EXAMPLE) as unknown as {
		lineItems: Array<{
			qty: number;
			housePackageTool?: { doors: unknown[] };
		}>;
	};
	const line = seed.lineItems[0];
	if (!line) throw new Error("Expected seed fixture line");
	line.qty = 1;
	line.housePackageTool = {
		doors: [{ dimension: "3-0 x 6-8", lhQty: 0, rhQty: 0 }],
	};
	expect(newSalesFormSeedSchema.safeParse(seed).success).toBe(false);
});

test("accepts a handed HPT row without an unstated swing", () => {
	const seed = structuredClone(NEW_SALES_FORM_SEED_EXAMPLE) as unknown as {
		lineItems: Array<{
			qty: number;
			housePackageTool?: { doors: unknown[] };
		}>;
	};
	const line = seed.lineItems[0];
	if (!line) throw new Error("Expected seed fixture line");
	line.qty = 1;
	line.housePackageTool = {
		doors: [{ dimension: "3-0 x 6-8", lhQty: 1, rhQty: 0 }],
	};
	expect(newSalesFormSeedSchema.safeParse(seed).success).toBe(true);
});

test("accepts the native unhanded HPT totalQty shape", () => {
	const seed = structuredClone(NEW_SALES_FORM_SEED_EXAMPLE);
	const line = seed.lineItems[0];
	if (!line) throw new Error("Expected seed fixture line");
	line.qty = 14;
	line.housePackageTool = {
		doors: [
			{ dimension: "2-4 x 6-8", totalQty: 1 },
			{ dimension: "2-10 x 6-8", totalQty: 11 },
			{ dimension: "3-0 x 6-8", totalQty: 2 },
		],
	};
	expect(newSalesFormSeedSchema.safeParse(seed).success).toBe(true);
});

test("rejects mixed handed and unhanded HPT quantity fields", () => {
	const seed = structuredClone(NEW_SALES_FORM_SEED_EXAMPLE) as unknown as {
		lineItems: Array<{ housePackageTool?: { doors: unknown[] } }>;
	};
	const line = seed.lineItems[0];
	if (!line?.housePackageTool) throw new Error("Expected seed fixture doors");
	line.housePackageTool.doors = [
		{ dimension: "3-0 x 6-8", totalQty: 1, lhQty: 1, rhQty: 0 },
	];
	expect(newSalesFormSeedSchema.safeParse(seed).success).toBe(false);
});

test("rejects an HPT line quantity that disagrees with its door rows", () => {
	const seed = structuredClone(NEW_SALES_FORM_SEED_EXAMPLE);
	const line = seed.lineItems[0];
	if (!line) throw new Error("Expected seed fixture line");
	line.qty = 2;
	expect(newSalesFormSeedSchema.safeParse(seed).success).toBe(false);
});


test("keeps identified mouldings selected at zero only with explicit quantity review", () => {
	const seed = {
		schemaVersion: 2,
		lineItems: [{ uid: "pending", qty: 0,
			formSteps: [{ stepId: 1, prodUid: "mouldings" }, { stepId: 215, meta: { selectedProdUids: ["profile"] } }],
			meta: { mouldingRows: [{ uid: "profile", qty: 0 }] },
		}],
		unresolved: [{ lineUid: "pending", stepId: null, field: "quantity", status: "ambiguous", reason: "Confirm piece count; length unavailable" }],
	};
	expect(newSalesFormSeedSchema.safeParse(seed).success).toBe(true);
	expect(newSalesFormSeedSchema.safeParse({ ...seed, unresolved: [] }).success).toBe(false);
	expect(newSalesFormSeedSchema.safeParse({ ...seed, lineItems: [{ ...seed.lineItems[0], meta: undefined }] }).success).toBe(false);
});
