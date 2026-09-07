import { describe, expect, it } from "bun:test";
import {
	buildOperationalDateListFilter,
	collectPaginatedUniqueOrderIds,
	readOperationalDate,
} from "./sales-pipeline-audit-options";

describe("sales pipeline audit options", () => {
	it("uses the supplied operational date for reproducible non-empty parity checks", () => {
		expect(
			readOperationalDate(["--operational-date", "2026-09-02"], "2026-09-05"),
		).toBe("2026-09-02");
	});

	it("uses the runtime date when no override is supplied", () => {
		expect(readOperationalDate([], "2026-09-05")).toBe("2026-09-05");
	});

	for (const value of ["", "09/02/2026", "2026-02-30", "2026-9-2"]) {
		it(`rejects invalid operational date ${value || "<empty>"}`, () => {
			expect(() =>
				readOperationalDate(["--operational-date", value], "2026-09-05"),
			).toThrow("--operational-date requires a real YYYY-MM-DD date");
		});
	}

	it("uses Due Today only for the runtime day and an exact date for historical parity", () => {
		expect(buildOperationalDateListFilter("2026-09-05", "2026-09-05")).toEqual({
			due: "today",
		});
		expect(buildOperationalDateListFilter("2026-09-02", "2026-09-05")).toEqual({
			productionDueDate: "2026-09-02",
		});
	});

	it("exhausts bounded list pages and reports exact unique membership", async () => {
		const cursors: Array<string | number | null | undefined> = [];
		const result = await collectPaginatedUniqueOrderIds(async (cursor) => {
			cursors.push(cursor);
			return cursor == null
				? { data: [{ id: 3 }, { id: 1 }], meta: { cursor: "page-2" } }
				: { data: [{ id: 3 }, { id: 2 }], meta: { cursor: null } };
		}, 15);

		expect(cursors).toEqual([undefined, "page-2"]);
		expect(result).toEqual({
			orderIds: [1, 2, 3],
			pageCount: 2,
			truncated: false,
		});
	});

	it("labels a still-paginated list as truncated at the explicit page bound", async () => {
		const result = await collectPaginatedUniqueOrderIds(
			async (cursor) => ({
				data: [{ id: Number(cursor || 0) + 1 }],
				meta: { cursor: Number(cursor || 0) + 1 },
			}),
			2,
		);

		expect(result).toEqual({
			orderIds: [1, 2],
			pageCount: 2,
			truncated: true,
		});
	});
});
