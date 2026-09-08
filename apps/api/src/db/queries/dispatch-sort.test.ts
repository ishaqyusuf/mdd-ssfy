import { describe, expect, it } from "bun:test";
import { queryMeta } from "@gnd/utils/query-response";
import { dispatchSortField } from "./dispatch-sort";

describe("Dispatch order date pagination", () => {
	for (const direction of ["asc", "desc"]) {
		it(`sorts by the related order date ${direction} before pagination`, () => {
			for (const cursor of ["0", "20", "40"]) {
				expect(
					queryMeta(
						{ size: 20, cursor, sort: [`orderDate.${direction}`] },
						dispatchSortField,
					),
				).toEqual({
					skip: Number(cursor),
					take: 20,
					orderBy: [{ order: { createdAt: direction } }, { id: direction }],
				});
			}
		});
	}
	it("preserves existing default and completion sorting", () => {
		for (const field of ["dueDate", "createdAt", "deliveredAt"]) {
			expect(
				queryMeta({ size: 20, sort: [`${field}.desc`] }, dispatchSortField)
					.orderBy,
			).toEqual({ [field]: "desc" });
		}
	});
});
