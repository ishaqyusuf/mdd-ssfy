import { describe, expect, it } from "bun:test";

import { getJobs, getJobsSchema } from "./jobs";

describe("getJobs unit filtering", () => {
	it("maps a numeric unitId to the active job homeId filter", async () => {
		const countCalls: unknown[] = [];
		const findManyCalls: unknown[] = [];
		const db = {
			jobs: {
				count: async (args: unknown) => {
					countCalls.push(structuredClone(args));
					return 0;
				},
				findMany: async (args: unknown) => {
					findManyCalls.push(structuredClone(args));
					return [];
				},
			},
		};
		const input = getJobsSchema.parse({ unitId: 42 });

		const result = await getJobs({ db } as never, input);

		expect(input.unitId).toBe(42);
		expect(countCalls).toHaveLength(1);
		expect(countCalls[0]).toMatchObject({
			where: {
				homeId: 42,
				deletedAt: null,
			},
		});
		expect(findManyCalls).toHaveLength(1);
		expect(findManyCalls[0]).toMatchObject({
			where: {
				homeId: 42,
				deletedAt: null,
			},
		});
		expect(result.data).toEqual([]);
	});
});
