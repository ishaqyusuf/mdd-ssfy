import { describe, expect, it } from "bun:test";
import { getNewSalesFormPrintContext } from "./new-sales-form";

describe("New Sales Form print context", () => {
	it("reads only the current Sales setting without loading the workflow graph", async () => {
		let query: unknown;
		const ctx = {
			db: {
				settings: {
					findFirst: async (input: unknown) => {
						query = input;
						return { id: 7, meta: { print: { footer: "Current" } } };
					},
				},
			},
		};
		const typedContext = ctx as unknown as Parameters<
			typeof getNewSalesFormPrintContext
		>[0];

		const result = await getNewSalesFormPrintContext(typedContext);

		expect(query).toEqual({
			where: { type: "sales-settings", deletedAt: null },
			orderBy: { id: "asc" },
			select: { id: true, meta: true },
		});
		expect(result).toEqual({
			settingId: 7,
			settingsMeta: { print: { footer: "Current" } },
		});
	});
});
