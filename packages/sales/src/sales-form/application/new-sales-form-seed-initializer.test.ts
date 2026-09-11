import { describe, expect, it } from "bun:test";
import type { NewSalesFormSeed } from "../contracts/new-sales-form-seed";
import {
	salesFormExtraCostSchema,
	salesFormLineItemSchema,
	salesFormMetaSchema,
	salesFormSummarySchema,
} from "../contracts/schemas";
import type {
	WorkflowComponentRecord,
	WorkflowRouteData,
} from "../ui/workflow/workflow-records";
import { initializeNewSalesFormSeed } from "./new-sales-form-seed-initializer";
import {
	hydrateSalesFormRecord,
	toSalesFormSaveDraftPayload,
} from "./record-normalization";

const routeData: WorkflowRouteData = {
	rootStepUid: "item-type",
	composedRouter: {
		interior: {
			routeSequence: [{ uid: "frame" }, { uid: "door" }],
			config: { noHandle: false, hasSwing: true },
		},
		exterior: {
			routeSequence: [{ uid: "frame" }, { uid: "door" }],
			config: { noHandle: false, hasSwing: true },
		},
	},
	stepsById: { 1: "item-type", 2: "frame", 3: "door" },
	stepsByUid: {
		"item-type": { id: 1, uid: "item-type", title: "Item Type" },
		frame: { id: 2, uid: "frame", title: "Frame" },
		door: { id: 3, uid: "door", title: "Door" },
	},
};

const componentsByStepId: Record<number, WorkflowComponentRecord[]> = {
	1: [
		{ id: 10, uid: "interior", title: "Interior Door", basePrice: 0 },
		{ id: 11, uid: "exterior", title: "Exterior Door", basePrice: 0 },
	],
	2: [
		{ id: 20, uid: "primed", title: "Primed Frame", basePrice: 20 },
		{
			id: 21,
			uid: "fiberglass",
			title: "Fiberglass Frame",
			basePrice: 30,
		},
	],
	3: [
		{
			id: 30,
			uid: "panel",
			title: "Panel Door",
			basePrice: 100,
			pricing: { "3-0 x 6-8": { basePrice: 150 } },
		},
		{
			id: 31,
			uid: "lite",
			title: "Lite Door",
			basePrice: 50,
			variations: [
				{
					rules: [
						{
							stepUid: "frame",
							operator: "is",
							componentsUid: ["fiberglass"],
						},
					],
				},
			],
		},
	],
};

const baseRecord = {
	type: "quote",
	salesId: null,
	form: { customerProfileId: 7 },
	lineItems: [],
	extraCosts: [],
	summary: { taxRate: 0 },
};

function seedLine(
	itemType: "interior" | "exterior",
	frame: "primed" | "fiberglass",
	doorUids: string[] = ["panel"],
): NewSalesFormSeed {
	return {
		schemaVersion: 2,
		lineItems: [
			{
				uid: `${itemType}-line`,
				qty: 1,
				formSteps: [
					{ stepId: 1, prodUid: itemType },
					{ stepId: 2, prodUid: frame },
					{ stepId: 3, meta: { selectedProdUids: doorUids } },
				],
			},
		],
		unresolved: [],
	};
}

function initialize(
	seed: NewSalesFormSeed,
	defaultsByItemTypeUid?: Readonly<
		Record<string, Readonly<Record<string, string>>>
	>,
) {
	return initializeNewSalesFormSeed({
		seed,
		baseRecord,
		routeData,
		defaultsByItemTypeUid,
		pricing: { profileCoefficient: 0.5 },
		resolveComponents: ({ step }) => componentsByStepId[Number(step.id)] || [],
	});
}

describe("initializeNewSalesFormSeed", () => {
	it.each([
		["interior", "primed", 340],
		["exterior", "fiberglass", 360],
	] as const)(
		"replays and prices a native %s door shell",
		async (itemType, frame, expectedUnitPrice) => {
			const seed = seedLine(itemType, frame);
			const seedItem = seed.lineItems[0];
			if (!seedItem) throw new Error("Expected seed fixture line");
			seedItem.housePackageTool = {
				doors: [
					{
						dimension: "3-0 x 6-8",
						swing: "inswing",
						lhQty: 1,
						rhQty: 0,
					},
				],
			};

			const result = await initialize(seed);
			const line = result.record.lineItems[0];
			expect(result.issues).toEqual([]);
			expect(line?.uid).toBe(`${itemType}-line`);
			expect(line?.formSteps?.[2]?.meta).toMatchObject({
				selectedProdUids: ["panel"],
				selectedComponents: [expect.objectContaining({ uid: "panel", id: 30 })],
			});
			expect(line?.housePackageTool?.doors?.[0]).toMatchObject({
				dimension: "3-0 x 6-8",
				swing: "inswing",
				lhQty: 1,
				rhQty: 0,
				unitPrice: expectedUnitPrice,
				lineTotal: expectedUnitPrice,
			});
			expect(line?.lineTotal).toBe(expectedUnitPrice);
		},
	);

	it("prices HPT door tiers in dealer view like ordinary workflow components", async () => {
		const seed = seedLine("exterior", "fiberglass");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.housePackageTool = {
			doors: [
				{
					dimension: "3-0 x 6-8",
					swing: "inswing",
					lhQty: 1,
					rhQty: 0,
				},
			],
		};
		const tierOnlyDoorComponents = (componentsByStepId[3] || []).map(
			(component) =>
				component.uid === "panel"
					? { ...component, basePrice: null, salesPrice: null }
					: component,
		);

		const result = await initializeNewSalesFormSeed({
			seed,
			baseRecord,
			routeData,
			pricing: {
				profileCoefficient: 0.5,
				pricingView: "dealer",
				dealerSalesPercentage: 20,
			},
			resolveComponents: ({ step }) =>
				Number(step.id) === 3
					? tierOnlyDoorComponents
					: componentsByStepId[Number(step.id)] || [],
		});
		const line = result.record.lineItems[0];

		expect(result.issues).toEqual([]);
		expect(line?.formSteps?.[1]?.meta).toMatchObject({
			selectedComponents: [expect.objectContaining({ salesPrice: 72 })],
		});
		expect(line?.formSteps?.[2]?.meta).toMatchObject({
			selectedComponents: [
				expect.objectContaining({
					uid: "panel",
					salesPrice: 0,
					_metaData: expect.objectContaining({ priceMissing: true }),
				}),
			],
		});
		expect(line?.housePackageTool?.doors?.[0]).toMatchObject({
			jambSizePrice: 360,
			unitPrice: 432,
			lineTotal: 432,
			meta: {
				baseUnitPrice: 150,
				doorSalesUnitPrice: 360,
			},
		});
		expect(line?.lineTotal).toBe(432);
	});

	it("hydrates multi-select metadata through the canonical mutation", async () => {
		const result = await initialize(
			seedLine("exterior", "fiberglass", ["panel", "lite"]),
		);
		const line = result.record.lineItems[0];
		expect(line?.formSteps?.[2]).toMatchObject({
			prodUid: "panel",
			price: 300,
			meta: {
				selectedProdUids: ["panel", "lite"],
				selectedComponents: [
					expect.objectContaining({ uid: "panel", salesPrice: 200 }),
					expect.objectContaining({ uid: "lite", salesPrice: 100 }),
				],
			},
		});
		expect(line?.unitPrice).toBe(360);
		expect(line?.lineTotal).toBe(360);
	});

	it("keeps a source-grounded custom value transient and read-only in preview", async () => {
		const customRouteData: WorkflowRouteData = {
			...routeData,
			stepsByUid: {
				...routeData.stepsByUid,
				frame: {
					...routeData.stepsByUid?.frame,
					meta: { custom: true },
				},
			},
		};
		const seed = seedLine("exterior", "fiberglass");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.formSteps = seedItem.formSteps.map((step) =>
			step.stepId === 2
				? { stepId: 2, value: "Customer-stated custom jamb" }
				: step,
		);

		const result = await initializeNewSalesFormSeed({
			seed,
			baseRecord,
			routeData: customRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) =>
				componentsByStepId[Number(step.id)] || [],
		});
		const customStep = result.record.lineItems[0]?.formSteps?.[1];

		expect(result.issues).toEqual([
			{
				lineUid: "exterior-line",
				stepId: 2,
				reason: "custom-value-requires-review",
			},
		]);
		expect(customStep).toMatchObject({
			componentId: null,
			prodUid: "custom-preview:2",
			value: "Customer-stated custom jamb",
			price: 0,
			basePrice: 0,
			meta: {
				custom: true,
				selectedProdUids: ["custom-preview:2"],
				selectedComponents: [
					expect.objectContaining({
						id: null,
						uid: "custom-preview:2",
						custom: true,
						_metaData: expect.objectContaining({ previewOnly: true }),
					}),
				],
			},
		});
	});

	it("uses an exact standard component instead of duplicating a custom value", async () => {
		const customRouteData: WorkflowRouteData = {
			...routeData,
			stepsByUid: {
				...routeData.stepsByUid,
				frame: {
					...routeData.stepsByUid?.frame,
					meta: { custom: true },
				},
			},
		};
		const seed = seedLine("exterior", "fiberglass");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.formSteps = seedItem.formSteps.map((step) =>
			step.stepId === 2 ? { stepId: 2, value: "Fiberglass   Frame" } : step,
		);

		const result = await initializeNewSalesFormSeed({
			seed,
			baseRecord,
			routeData: customRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) =>
				componentsByStepId[Number(step.id)] || [],
		});
		const frameStep = result.record.lineItems[0]?.formSteps?.[1];

		expect(result.issues).toEqual([]);
		expect(frameStep?.prodUid).toBe("fiberglass");
		expect(frameStep?.componentId).toBe(21);
		expect(frameStep?.meta?.custom).toBe(false);
	});

	it("reports a custom selection on a step without custom capability", async () => {
		const seed = seedLine("exterior", "fiberglass");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.formSteps = seedItem.formSteps.map((step) =>
			step.stepId === 2 ? { stepId: 2, value: "Custom frame" } : step,
		);

		const result = await initialize(seed);

		expect(result.issues).toContainEqual({
			lineUid: "exterior-line",
			stepId: 2,
			reason: "custom-step-not-supported",
		});
		expect(result.record.lineItems[0]?.formSteps?.[1]?.prodUid).toBe("");
	});

	it("hydrates price-free native service rows and delivery through form-owned calculators", async () => {
		const serviceRouteData: WorkflowRouteData = {
			...routeData,
			composedRouter: {
				...routeData.composedRouter,
				services: { routeSequence: [], config: {} },
			},
		};
		const serviceSeed: NewSalesFormSeed = {
			schemaVersion: 2,
			lineItems: [
				{
					uid: "service-line",
					qty: 1,
					formSteps: [{ stepId: 1, prodUid: "services" }],
					meta: {
						serviceRows: [
							{ uid: "svc-1", service: "Field install", qty: 2 },
							{ uid: "svc-2", service: "Cleanup", qty: 1 },
						],
					},
				},
			],
			form: { deliveryOption: "delivery" },
			extraCosts: [
				{ id: null, label: "Delivery", type: "Delivery", amount: 45 },
			],
			unresolved: [],
		};

		const result = await initializeNewSalesFormSeed({
			seed: serviceSeed,
			baseRecord,
			routeData: serviceRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) =>
				Number(step.id) === 1
					? [
							...(componentsByStepId[1] || []),
							{ id: 12, uid: "services", title: "Services", basePrice: 0 },
						]
					: componentsByStepId[Number(step.id)] || [],
		});
		const line = result.record.lineItems[0];

		expect(result.issues).toEqual([
			{
				lineUid: "service-line",
				stepId: 1,
				reason: "service-price-missing",
			},
			{
				lineUid: "service-line",
				stepId: 1,
				reason: "service-price-missing",
			},
		]);
		expect(line).toMatchObject({
			title: "Services",
			description: "FIELD INSTALL | CLEANUP",
			qty: 3,
			unitPrice: 0,
			lineTotal: 0,
			meta: {
				serviceRows: [
					expect.objectContaining({
						uid: "svc-1",
						service: "FIELD INSTALL",
						qty: 2,
						unitPrice: 0,
						taxxable: false,
					}),
					expect.objectContaining({
						uid: "svc-2",
						service: "CLEANUP",
						qty: 1,
						unitPrice: 0,
					}),
				],
			},
		});
		expect(result.record.form).toMatchObject({
			customerProfileId: 7,
			deliveryOption: "delivery",
		});
		expect(
			result.record.extraCosts.find((cost) => cost.type === "Delivery"),
		).toEqual({
			id: null,
			label: "Delivery",
			type: "Delivery",
			amount: 45,
			taxxable: false,
		});
		expect(result.record.summary.delivery).toBe(45);
		expect(result.record.summary.grandTotal).toBe(45);
	});

	it("creates a reviewable zero delivery row when delivery has no stated amount", async () => {
		const seed = seedLine("interior", "primed");
		if (seed.schemaVersion !== 2) throw new Error("Expected v2 seed");
		seed.form = { deliveryOption: "delivery" };

		const result = await initialize(seed);

		expect(result.issues).toContainEqual({
			lineUid: null,
			stepId: null,
			reason: "delivery-price-missing",
		});
		expect(result.record.extraCosts).toContainEqual({
			id: null,
			label: "Delivery",
			type: "Delivery",
			amount: 0,
			taxxable: false,
		});
	});

	it("keeps service rows off non-Service item routes", async () => {
		const seed = seedLine("exterior", "fiberglass");
		const seedItem = seed.lineItems[0];
		if (!seedItem || seed.schemaVersion !== 2)
			throw new Error("Expected v2 seed fixture line");
		seedItem.meta = {
			serviceRows: [{ uid: "svc-1", service: "Install", qty: 1 }],
		};

		const result = await initialize(seed);

		expect(result.issues).toContainEqual({
			lineUid: "exterior-line",
			stepId: 1,
			reason: "service-rows-outside-service-route",
		});
		expect(result.record.lineItems[0]?.meta?.serviceRows).toBeUndefined();
	});

	it("still initializes schemaVersion 1 seeds", async () => {
		const current = seedLine("interior", "primed");
		const legacy: NewSalesFormSeed = {
			schemaVersion: 1,
			lineItems: current.lineItems.map(({ meta: _meta, ...line }) => line),
			unresolved: current.unresolved,
		};

		const result = await initialize(legacy);

		expect(result.issues).toEqual([]);
		expect(result.record.lineItems[0]?.formSteps?.[1]?.prodUid).toBe("primed");
	});

	it("uses a configured default only for an omitted, resolved step", async () => {
		const seed = seedLine("interior", "primed");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.formSteps = seedItem.formSteps.filter((step) => step.stepId !== 2);
		const result = await initialize(seed, {
			interior: { frame: "primed" },
		});
		expect(result.record.lineItems[0]?.formSteps?.[1]?.prodUid).toBe("primed");
		expect(result.issues).toEqual([]);

		seed.unresolved.push({
			lineUid: "interior-line",
			stepId: 2,
			field: "frame",
			status: "ambiguous",
			reason: "Customer named two frame types",
		});
		const blocked = await initialize(seed, {
			interior: { frame: "primed" },
		});
		expect(blocked.record.lineItems[0]?.formSteps?.[1]?.prodUid).toBe("");
		expect(blocked.unresolved).toEqual(seed.unresolved);
	});

	it("does not apply defaults when an unresolved fact has line-wide scope", async () => {
		const seed = seedLine("interior", "primed");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.formSteps = seedItem.formSteps.filter((step) => step.stepId !== 2);
		seed.unresolved.push({
			lineUid: seedItem.uid,
			stepId: null,
			field: "customer-note",
			status: "ambiguous",
			reason: "The note does not identify which requested option it describes",
		});

		const result = await initialize(seed, {
			interior: { frame: "primed" },
		});

		expect(result.record.lineItems[0]?.formSteps?.[1]?.prodUid).toBe("");
		expect(result.unresolved).toEqual(seed.unresolved);
	});

	it("does not apply defaults to any line when unresolved scope is global", async () => {
		const seed = seedLine("interior", "primed");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.formSteps = seedItem.formSteps.filter((step) => step.stepId !== 2);
		seed.unresolved.push({
			lineUid: null,
			stepId: null,
			field: "handwritten-request",
			status: "unreadable",
			reason:
				"The handwritten annotation cannot be assigned to a specific line",
		});

		const result = await initialize(seed, {
			interior: { frame: "primed" },
		});

		expect(result.record.lineItems[0]?.formSteps?.[1]?.prodUid).toBe("");
		expect(result.unresolved).toEqual(seed.unresolved);
	});

	it("rejects a dependency-hidden selection without substituting a default", async () => {
		const result = await initialize(seedLine("exterior", "primed", ["lite"]), {
			exterior: { door: "panel" },
		});
		expect(result.issues).toContainEqual({
			lineUid: "exterior-line",
			stepId: 3,
			reason: "component-not-visible",
			componentUid: "lite",
		});
		expect(result.record.lineItems[0]?.formSteps?.[2]?.prodUid).toBe("");
	});

	it("keeps an unpriced selection reviewable but reports a blocking issue", async () => {
		const frameComponents = componentsByStepId[2];
		if (!frameComponents) throw new Error("Expected frame component fixtures");
		const unpricedComponents: Record<number, WorkflowComponentRecord[]> = {
			...componentsByStepId,
			2: frameComponents.map((component) =>
				component.uid === "fiberglass"
					? { ...component, basePrice: null, salesPrice: null }
					: component,
			),
		};
		const result = await initializeNewSalesFormSeed({
			seed: seedLine("exterior", "fiberglass"),
			baseRecord,
			routeData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) =>
				unpricedComponents[Number(step.id)] || [],
		});

		expect(result.issues).toContainEqual({
			lineUid: "exterior-line",
			stepId: 2,
			reason: "component-price-missing",
			componentUid: "fiberglass",
		});
		expect(result.record.lineItems[0]?.formSteps?.[1]?.prodUid).toBe(
			"fiberglass",
		);
	});

	it("follows the canonical component redirect while replaying selections", async () => {
		const frameComponents = componentsByStepId[2];
		if (!frameComponents) throw new Error("Expected frame component fixtures");
		const redirectRouteData: WorkflowRouteData = {
			...routeData,
			composedRouter: {
				...routeData.composedRouter,
				exterior: {
					routeSequence: [{ uid: "frame" }, { uid: "door" }, { uid: "finish" }],
					config: { noHandle: false, hasSwing: true },
				},
			},
			stepsById: { ...routeData.stepsById, 4: "finish" },
			stepsByUid: {
				...routeData.stepsByUid,
				finish: { id: 4, uid: "finish", title: "Finish" },
			},
		};
		const redirectedComponents: Record<number, WorkflowComponentRecord[]> = {
			...componentsByStepId,
			2: frameComponents.map((component) =>
				component.uid === "fiberglass"
					? { ...component, redirectUid: "finish" }
					: component,
			),
			4: [{ id: 40, uid: "painted", title: "Painted", basePrice: 10 }],
		};
		const seed = seedLine("exterior", "fiberglass");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.formSteps = seedItem.formSteps.filter(
			(step) => step.stepId !== 3 && step.stepId !== 4,
		);

		const result = await initializeNewSalesFormSeed({
			seed,
			baseRecord,
			routeData: redirectRouteData,
			pricing: { profileCoefficient: 0.5 },
			resolveComponents: ({ step }) =>
				redirectedComponents[Number(step.id)] || [],
		});

		expect(result.issues).toEqual([]);
		expect(
			result.record.lineItems[0]?.formSteps?.map((step) => step.step?.uid),
		).toContain("finish");
		expect(
			result.record.lineItems[0]?.formSteps?.find(
				(step) => step.step?.uid === "finish",
			)?.prodUid,
		).toBe("");
		expect(
			result.record.lineItems[0]?.formSteps?.find(
				(step) => step.step?.uid === "door",
			)?.meta,
		).toMatchObject({ redirectDisabled: true, redirectTargetUid: "finish" });
	});

	it("produces the native save shell and remains stable through form rehydration", async () => {
		const seed = seedLine("exterior", "fiberglass");
		const seedItem = seed.lineItems[0];
		if (!seedItem) throw new Error("Expected seed fixture line");
		seedItem.housePackageTool = {
			doors: [
				{
					dimension: "3-0 x 6-8",
					swing: "inswing",
					lhQty: 1,
					rhQty: 0,
				},
			],
		};

		const initialized = await initialize(seed);
		const payload = toSalesFormSaveDraftPayload(initialized.record, true);
		expect(salesFormMetaSchema.safeParse(payload.meta).success).toBe(true);
		expect(
			payload.lineItems.every(
				(line) => salesFormLineItemSchema.safeParse(line).success,
			),
		).toBe(true);
		expect(
			payload.extraCosts.every(
				(cost) => salesFormExtraCostSchema.safeParse(cost).success,
			),
		).toBe(true);
		expect(salesFormSummarySchema.safeParse(payload.summary).success).toBe(
			true,
		);

		const reopened = hydrateSalesFormRecord({
			...initialized.record,
			form: payload.meta,
			lineItems: payload.lineItems,
			extraCosts: payload.extraCosts,
			summary: payload.summary,
		});
		expect(reopened.lineItems[0]?.formSteps?.[2]?.meta).toMatchObject({
			selectedProdUids: ["panel"],
			selectedComponents: [expect.objectContaining({ uid: "panel", id: 30 })],
		});
		expect(reopened.lineItems[0]?.housePackageTool?.doors?.[0]).toMatchObject({
			dimension: "3-0 x 6-8",
			unitPrice: 360,
			lineTotal: 360,
		});
		expect(reopened.summary).toEqual(payload.summary);
	});
});
