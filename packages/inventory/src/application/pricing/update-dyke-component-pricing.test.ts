import { describe, expect, it } from "bun:test";

import { updateDykeComponentPricing } from "./update-dyke-component-pricing";

describe("updateDykeComponentPricing", () => {
	it("consolidates duplicate natural-key rows when the current id is known", async () => {
		const updates: Array<Record<string, unknown>> = [];
		const db = {
			dykePricingSystem: {
				updateMany: async (input: Record<string, unknown>) => {
					updates.push(input);
					return { count: updates.length === 1 ? 1 : 2 };
				},
				createMany: async () => ({ count: 0 }),
			},
		};

		await updateDykeComponentPricing(db as never, {
			stepId: 51,
			stepProductUid: "BcUhC",
			pricings: [
				{
					id: 3220,
					dependenciesUid: "1-8 x 6-8",
					price: 80.5,
				},
			],
		});

		expect(updates).toEqual([
			{
				where: { id: { in: [3220] } },
				data: { price: 80.5 },
			},
			{
				where: {
					stepProductUid: "BcUhC",
					dependenciesUid: "1-8 x 6-8",
					deletedAt: null,
				},
				data: { price: 80.5 },
			},
		]);
	});

  it("updates every active natural-key match when the caller has a stale id", async () => {
    const updates: Array<Record<string, unknown>> = [];
    let createCount = 0;
    const db = {
      dykePricingSystem: {
        updateMany: async (input: Record<string, unknown>) => {
          updates.push(input);
          return { count: 2 };
        },
        createMany: async () => {
          createCount += 1;
          return { count: 1 };
        },
      },
    };

    const result = await updateDykeComponentPricing(db as never, {
      stepId: 51,
      stepProductUid: "BcUhC",
      pricings: [
        {
          dependenciesUid: "1-8 x 6-8",
          price: 80.5,
        },
      ],
    });

    expect(updates).toEqual([
      {
        where: {
          stepProductUid: "BcUhC",
          dependenciesUid: "1-8 x 6-8",
          deletedAt: null,
        },
        data: { price: 80.5 },
      },
    ]);
    expect(createCount).toBe(0);
    expect(result).toMatchObject({ createdCount: 0, updatedCount: 2 });
  });

  it("creates a natural-key row when no active pricing exists", async () => {
    const creates: Array<Record<string, unknown>> = [];
    const db = {
      dykePricingSystem: {
        updateMany: async () => ({ count: 0 }),
        createMany: async (input: Record<string, unknown>) => {
          creates.push(input);
          return { count: 1 };
        },
      },
    };

    const result = await updateDykeComponentPricing(db as never, {
      stepId: 51,
      stepProductUid: "BcUhC",
      pricings: [
        {
          dependenciesUid: "1-10 x 6-8",
          price: 82,
        },
      ],
    });

    expect(creates).toEqual([
      {
        data: [
          {
            dependenciesUid: "1-10 x 6-8",
            price: 82,
            dykeStepId: 51,
            stepProductUid: "BcUhC",
          },
        ],
      },
    ]);
    expect(result).toMatchObject({ createdCount: 1, updatedCount: 0 });
  });
});
