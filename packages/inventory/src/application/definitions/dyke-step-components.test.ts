import { describe, expect, it } from "bun:test";
import { upsertDykeCustomStepComponent } from "./dyke-step-components";

function customComponentRecord() {
	return {
		id: 1,
		uid: "custom-1",
		name: "CUSTOM PART",
		dykeStepId: 2,
		custom: true,
		meta: {},
		img: null,
		productCode: null,
		redirectUid: null,
		sortIndex: null,
		door: null,
		product: null,
		step: { id: 2, uid: "step-2", title: "Door", meta: {} },
		sorts: [],
		_count: { housePackageTools: 0, salesDoors: 0, stepForms: 0 },
		deletedAt: null,
	};
}

describe("custom Dyke step components", () => {
	it("rejects editing a standard component through the custom endpoint", async () => {
		const db = {
			dykeStepProducts: {
				findFirst: async () => ({
					id: 1,
					custom: false,
					dykeStepId: 2,
					meta: {},
				}),
			},
		};

		expect(
			upsertDykeCustomStepComponent(db as never, {
				id: 1,
				stepId: 2,
				title: "NOT CUSTOM",
			}),
		).rejects.toThrow("Selected component is not a custom component");
	});

	it("rejects moving an existing custom component to another step", async () => {
		const db = {
			dykeStepProducts: {
				findFirst: async () => ({
					id: 1,
					custom: true,
					dykeStepId: 9,
					meta: {},
				}),
			},
		};

		expect(
			upsertDykeCustomStepComponent(db as never, {
				id: 1,
				stepId: 2,
				title: "CUSTOM PART",
			}),
		).rejects.toThrow("Custom component does not belong to this step");
	});

	it("clears an existing custom component price when null is submitted", async () => {
		const pricingUpdates: Array<Record<string, unknown>> = [];
		const component = customComponentRecord();
		const db = {
			dykeStepProducts: {
				findFirst: async () => ({
					id: 1,
					custom: true,
					dykeStepId: 2,
					meta: {},
				}),
				update: async () => ({ id: 1, dykeStepId: 2 }),
				findUniqueOrThrow: async () => component,
			},
			dykePricingSystem: {
				findMany: async () => [
					{
						id: 55,
						stepProductUid: "custom-1",
						dependenciesUid: null,
						price: 25,
					},
				],
				updateMany: async (input: Record<string, unknown>) => {
					pricingUpdates.push(input);
					return { count: 1 };
				},
				createMany: async () => ({ count: 0 }),
			},
		};

		await upsertDykeCustomStepComponent(db as never, {
			id: 1,
			stepId: 2,
			title: "CUSTOM PART",
			price: null,
			pricingId: 55,
		});

		expect(pricingUpdates).toHaveLength(1);
		expect(pricingUpdates[0]?.where).toEqual({ id: { in: [55] } });
		expect(
			(pricingUpdates[0]?.data as { deletedAt?: unknown }).deletedAt,
		).toBeInstanceOf(Date);
	});
});
