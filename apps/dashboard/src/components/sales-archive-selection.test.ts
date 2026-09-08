import { expect, test } from "bun:test";
import { getSalesArchiveCandidates } from "./sales-archive-selection";

test("archive remains available when workflow projection is missing", () => {
	expect(
		getSalesArchiveCandidates([
			{ salesId: 1, orderNo: "NEW", archivedAt: null, pipeline: null },
		]),
	).toEqual([{ salesId: 1, orderNo: "NEW", archived: false }]);
});
test("current archive state wins over older pipeline evidence", () => {
	expect(
		getSalesArchiveCandidates([
			{
				salesId: 1,
				orderNo: "NEW",
				archivedAt: "2026-09-08",
				pipeline: { evidence: { commercial: { archivedAt: null } } },
			},
		])[0]?.archived,
	).toBe(true);
});
test("missing archive evidence is not guessed to mean active", () => {
	expect(getSalesArchiveCandidates([{ salesId: 1, orderNo: "NEW" }])).toEqual(
		[],
	);
});
