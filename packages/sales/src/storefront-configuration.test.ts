import { describe, expect, it } from "bun:test";
import {
	projectStorefrontOfferRoute,
	type StorefrontComponent,
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
		expect(result.steps.find((step) => step.stepUid === "door-style"))
			.toMatchObject({
				components: [{ uid: "shaker", title: "Shaker Door" }],
			});
		expect(result.steps.find((step) => step.stepUid === "hinge"))
			.toMatchObject({
				visible: false,
				selectedComponentUid: "brass",
			});
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
});

