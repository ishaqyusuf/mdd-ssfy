import { describe, expect, it } from "bun:test";
import {
	deriveDealerWorkflowVisibility,
	isDealerRootComponentAllowed,
	isDealerShelfCategoryAllowed,
	isDealerShelfProductAllowed,
	resolveDealerWorkflowStepUid,
} from "./dealer-workflow-visibility";

describe("dealer workflow visibility", () => {
	const routeData = {
		settingsMeta: {
			dealerShelfCategoryVisibility: {
				mode: "allowlist",
				categoryIds: [10],
			},
		},
		rootStepUid: "item-type",
		composedRouter: {
			door: {
				config: {
					dealerVisible: true,
				},
				routeSequence: [{ uid: "size" }, { uid: "finish" }],
				route: {
					door: "size",
					size: "finish",
				},
			},
			service: {
				config: {
					dealerVisible: false,
				},
				routeSequence: [{ uid: "service-options" }],
				route: {
					service: "service-options",
				},
			},
		},
		stepsById: {
			1: "item-type",
			2: "size",
			3: "service-options",
		},
		stepsByUid: {
			"item-type": {
				title: "Item Type",
			},
			size: {
				title: "Size",
			},
			"service-options": {
				title: "Service Options",
			},
		},
	};

	it("builds an allowed dealer graph from visible roots", () => {
		const visibility = deriveDealerWorkflowVisibility(routeData);

		expect(visibility.visibleRootUids.has("door")).toBe(true);
		expect(visibility.visibleRootUids.has("service")).toBe(false);
		expect(visibility.allowedStepUids.has("size")).toBe(true);
		expect(visibility.allowedStepUids.has("finish")).toBe(true);
		expect(visibility.allowedStepUids.has("service-options")).toBe(false);
		expect(isDealerRootComponentAllowed(visibility, "door")).toBe(true);
		expect(isDealerRootComponentAllowed(visibility, "service")).toBe(false);
	});

	it("resolves allowed step lookups without authorizing hidden routes", () => {
		const visibility = deriveDealerWorkflowVisibility(routeData);

		expect(resolveDealerWorkflowStepUid(routeData, { stepId: 2 })).toBe("size");
		expect(resolveDealerWorkflowStepUid(routeData, { stepId: 3 })).toBe(
			"service-options",
		);
		expect(visibility.allowedStepUids.has("service-options")).toBe(false);
		expect(resolveDealerWorkflowStepUid(routeData, { stepTitle: "Size" })).toBe(
			"size",
		);
	});

	it("filters shelf categories and products by allowlisted category or parent", () => {
		const visibility = deriveDealerWorkflowVisibility(routeData);

		expect(
			isDealerShelfCategoryAllowed(visibility, {
				id: 10,
				parentCategoryId: null,
			}),
		).toBe(true);
		expect(
			isDealerShelfCategoryAllowed(visibility, {
				id: 20,
				parentCategoryId: 10,
			}),
		).toBe(true);
		expect(
			isDealerShelfProductAllowed(visibility, {
				categoryId: 20,
				parentCategoryId: null,
			}),
		).toBe(false);
		expect(
			isDealerShelfProductAllowed(visibility, {
				categoryId: 20,
				parentCategoryId: 10,
			}),
		).toBe(true);
	});

	it("defaults missing shelf visibility to all categories", () => {
		const visibility = deriveDealerWorkflowVisibility({
			settingsMeta: {},
			rootStepUid: "item-type",
			composedRouter: {},
		});

		expect(
			isDealerShelfProductAllowed(visibility, {
				categoryId: 99,
				parentCategoryId: null,
			}),
		).toBe(true);
	});
});
