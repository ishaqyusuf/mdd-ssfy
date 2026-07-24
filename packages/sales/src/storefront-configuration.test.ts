import { describe, expect, it } from "bun:test";
import { resolveDoorTierPricing } from "./sales-form/domain/workflow-calculators";
import {
	type StorefrontComponent,
	deduplicateStorefrontOptions,
	isStorefrontStepWaivedBySelection,
	projectStorefrontDoorScheduleComponents,
	projectStorefrontOfferRoute,
	resolveStorefrontProductTypes,
} from "./storefront-configuration";

const routeData = {
	composedRouter: {
		doors: {
			routeSequence: [{ uid: "door-style" }, { uid: "hinge" }],
			route: {
				doors: "door-style",
				"door-style": "hinge",
			},
		},
	},
	stepsByUid: {
		"item-type": {
			id: 1,
			uid: "item-type",
			title: "Item Type",
			components: [{ id: 10, uid: "doors", title: "Doors" }],
		},
		"door-style": {
			id: 2,
			uid: "door-style",
			title: "Door",
			components: [
				{ id: 20, uid: "shaker", title: "Shaker" },
				{ id: 21, uid: "slab", title: "Slab" },
			],
		},
		hinge: {
			id: 3,
			uid: "hinge",
			title: "Hinges",
			components: [{ id: 30, uid: "brass", title: "Brass" }],
		},
	},
	stepsById: { 1: "item-type", 2: "door-style", 3: "hinge" },
	rootStepUid: "item-type",
};

const components: StorefrontComponent[] = [
	{
		sourceStepUid: "door-style",
		sourceComponentUid: "shaker",
		availableOnStorefront: true,
		status: "PUBLISHED",
		title: "Shaker Door",
		sortOrder: 0,
	},
	{
		sourceStepUid: "door-style",
		sourceComponentUid: "slab",
		availableOnStorefront: false,
		status: "DRAFT",
		sortOrder: 1,
	},
	{
		sourceStepUid: "hinge",
		sourceComponentUid: "brass",
		availableOnStorefront: true,
		status: "PUBLISHED",
		sortOrder: 0,
	},
];

describe("projectStorefrontOfferRoute", () => {
	it("projects only published components and applies a hidden canonical default", () => {
		const result = projectStorefrontOfferRoute({
			routeData,
			rootStepUid: "item-type",
			rootComponentUid: "doors",
			components,
			stepPolicies: [
				{
					stepUid: "door-style",
					visible: true,
					required: true,
					allowSkip: false,
					autoSelect: false,
					sortOrder: 1,
				},
				{
					stepUid: "hinge",
					visible: false,
					required: true,
					allowSkip: false,
					autoSelect: true,
					defaultComponentUid: "brass",
					sortOrder: 2,
				},
			],
			componentPolicies: [],
		});

		expect(result.ready).toBe(true);
		expect(
			result.steps.find((step) => step.stepUid === "door-style"),
		).toMatchObject({
			components: [{ uid: "shaker", title: "Shaker Door" }],
		});
		expect(result.steps.find((step) => step.stepUid === "hinge")).toMatchObject(
			{
				visible: false,
				selectedComponentUid: "brass",
			},
		);
	});

	it("blocks readiness when a hidden step has no published default", () => {
		const result = projectStorefrontOfferRoute({
			routeData,
			rootStepUid: "item-type",
			rootComponentUid: "doors",
			components,
			stepPolicies: [
				{
					stepUid: "hinge",
					visible: false,
					required: true,
					allowSkip: false,
					autoSelect: true,
					defaultComponentUid: "missing",
					sortOrder: 1,
				},
			],
			componentPolicies: [],
		});

		expect(result.ready).toBe(false);
		expect(result.issues.map((issue) => issue.code)).toContain(
			"DEFAULT_NOT_AVAILABLE",
		);
	});

	it("hides structural route steps that have no selectable components", () => {
		const structuralRouteData = structuredClone(routeData);
		structuralRouteData.composedRouter.doors.routeSequence.push({
			uid: "house-package-tool",
		});
		Object.assign(structuralRouteData.stepsByUid, {
			"house-package-tool": {
				id: 4,
				uid: "house-package-tool",
				title: "House Package Tool",
				components: [],
			},
		});

		const result = projectStorefrontOfferRoute({
			routeData: structuralRouteData,
			rootStepUid: "item-type",
			rootComponentUid: "doors",
			components,
			stepPolicies: [],
			componentPolicies: [],
		});

		expect(result.ready).toBe(true);
		expect(
			result.steps.find((step) => step.stepUid === "house-package-tool"),
		).toMatchObject({ visible: false, components: [] });
	});

	it("locks the offer product without rendering it as a customer option", () => {
		const result = projectStorefrontOfferRoute({
			routeData,
			rootStepUid: "item-type",
			rootComponentUid: "doors",
			offerSourceStepUid: "door-style",
			offerSourceComponentUid: "shaker",
			components,
			stepPolicies: [],
			componentPolicies: [],
		});

		expect(result.ready).toBe(true);
		expect(
			result.steps.find((step) => step.stepUid === "door-style"),
		).toMatchObject({
			visible: false,
			selectedComponentUid: "shaker",
		});
	});

	it("discovers product types from the product visibility rules", () => {
		const configuredRouteData = structuredClone(routeData);
		configuredRouteData.stepsByUid["item-type"].components.push({
			id: 11,
			uid: "slab-only",
			title: "Door Slabs Only",
		});
		configuredRouteData.composedRouter["slab-only"] = {
			routeSequence: [{ uid: "door-style" }],
			route: { "slab-only": "door-style" },
		};
		configuredRouteData.stepsByUid["door-style"].components[0].meta = {
			variations: [
				{
					rules: [
						{
							stepUid: "item-type",
							operator: "is",
							componentsUid: ["doors", "slab-only"],
						},
					],
				},
			],
		};

		expect(
			resolveStorefrontProductTypes({
				routeData: configuredRouteData,
				rootStepUid: "item-type",
				fallbackRootComponentUid: "doors",
				offerSourceStepUid: "door-style",
				offerSourceComponentUid: "shaker",
			}).map((component) => component.uid),
		).toEqual(["doors", "slab-only"]);
	});

	it("turns visibility identity controls into hidden product badges", () => {
		const configuredRouteData = structuredClone(routeData);
		configuredRouteData.composedRouter.doors.routeSequence.unshift({
			uid: "door-type",
		});
		configuredRouteData.stepsByUid["door-type"] = {
			id: 4,
			uid: "door-type",
			title: "Door Type",
			components: [{ id: 40, uid: "wood", title: "Wood Stile & Rail" }],
		};
		configuredRouteData.stepsByUid["door-style"].components[0].meta = {
			show: { wood: true },
		};
		const result = projectStorefrontOfferRoute({
			routeData: configuredRouteData,
			rootStepUid: "item-type",
			rootComponentUid: "doors",
			offerSourceStepUid: "door-style",
			offerSourceComponentUid: "shaker",
			components: [
				...components,
				{
					sourceStepUid: "door-type",
					sourceComponentUid: "wood",
					availableOnStorefront: true,
					status: "PUBLISHED",
					sortOrder: 0,
				},
			],
			stepPolicies: [],
			componentPolicies: [],
		});

		expect(result.ready).toBe(true);
		expect(
			result.steps.find((step) => step.stepUid === "door-type"),
		).toMatchObject({
			role: "IDENTITY",
			visible: false,
			selectedComponentUid: "wood",
		});
	});
});

describe("storefront option presentation", () => {
	it("keeps an unpriced door in the schedule with no selectable sizes", () => {
		const tier = resolveDoorTierPricing({
			pricing: {},
			size: "2-8 x 6-8",
		});
		expect(
			projectStorefrontDoorScheduleComponents([
				{
					stepProductId: 20,
					componentUid: "birkdale",
					title: "Birkdale 3 Panel",
					sizes: [
						{
							dimension: "2-8 x 6-8",
							hasPrice: tier.hasPrice,
							unitPrice: tier.salesPrice,
							basePrice: tier.basePrice,
						},
					],
				},
			]),
		).toEqual([
			{
				stepProductId: 20,
				componentUid: "birkdale",
				title: "Birkdale 3 Panel",
				sizes: [],
			},
		]);
	});

	it("keeps configured positive and zero-dollar door sizes selectable", () => {
		const pricing = {
			"1-6 x 6-8": { price: 38 },
			"2-0 x 6-8": { price: 0 },
		};
		const sizes = Object.keys(pricing).map((dimension) => {
			const tier = resolveDoorTierPricing({
				pricing,
				size: dimension,
				salesMultiplier: 1.25,
			});
			return {
				dimension,
				hasPrice: tier.hasPrice,
				unitPrice: tier.salesPrice,
				saleUnitPrice: tier.salesPrice * 0.8,
				percentageOff: 20,
				badgeText: "20% OFF",
				basePrice: tier.basePrice,
			};
		});
		expect(
			projectStorefrontDoorScheduleComponents([
				{
					stepProductId: 21,
					componentUid: "carrara",
					title: "Carrara",
					sizes,
				},
			]),
		).toEqual([
			{
				stepProductId: 21,
				componentUid: "carrara",
				title: "Carrara",
				sizes: [
					{
						dimension: "1-6 x 6-8",
						unitPrice: 47.5,
						saleUnitPrice: 38,
						percentageOff: 20,
						badgeText: "20% OFF",
						basePrice: 38,
					},
					{
						dimension: "2-0 x 6-8",
						unitPrice: 0,
						saleUnitPrice: 0,
						percentageOff: 20,
						badgeText: "20% OFF",
						basePrice: 0,
					},
				],
			},
		]);
	});

	it("deduplicates customer options by normalized title", () => {
		expect(
			deduplicateStorefrontOptions([
				{ uid: "jamb-a", title: '5-3/4"' },
				{ uid: "jamb-b", title: " 5 3/4 " },
				{ uid: "jamb-c", title: '6-9/16"' },
			]),
		).toEqual([
			{ uid: "jamb-a", title: '5-3/4"' },
			{ uid: "jamb-c", title: '6-9/16"' },
		]);
	});

	it("waives a dependent step when the customer explicitly selects none", () => {
		const steps = [
			{
				stepUid: "casing-toggle",
				components: [{ uid: "none", title: "No Casing" }],
			},
			{
				stepUid: "casing",
				components: [{ uid: "colonial", title: "Colonial" }],
			},
		];

		expect(
			isStorefrontStepWaivedBySelection({ title: "Casing" }, steps, {
				"casing-toggle": "none",
			}),
		).toBe(true);
	});
});
