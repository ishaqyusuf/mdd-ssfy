import { expect, it } from "bun:test";
import {
	advanceVercelQueryWindows,
	resumeVercelQueryWindows,
} from "./vercel-query-checkpoint";
const bounds = {
	windowStart: "2026-09-09T11:00:00.000Z",
	windowEnd: "2026-09-09T12:00:00.000Z",
};
it("splits saturated windows and resumes remaining work without gaps", () => {
	const initial = resumeVercelQueryWindows({ ...bounds, cursor: null });
	const split = advanceVercelQueryWindows(initial, true);
	expect(split).not.toBeNull();
	const pending = resumeVercelQueryWindows({ ...bounds, cursor: split });
	expect(pending).toEqual([
		[Date.parse(bounds.windowStart), Date.parse("2026-09-09T11:30:00Z")],
		[Date.parse("2026-09-09T11:30:00Z"), Date.parse(bounds.windowEnd)],
	]);
	const last = advanceVercelQueryWindows(pending, false);
	expect(
		advanceVercelQueryWindows(
			resumeVercelQueryWindows({ ...bounds, cursor: last }),
			false,
		),
	).toBeNull();
});
it("rejects out-of-scope checkpoints and unsplittable saturation", () => {
	expect(() =>
		resumeVercelQueryWindows({ ...bounds, cursor: "[[0,1]]" }),
	).toThrow();
	expect(() => advanceVercelQueryWindows([[0, 1]], true)).toThrow(
		"VERCEL_QUERY_DENSITY_EXCEEDED",
	);
	expect(() => resumeVercelQueryWindows({ ...bounds, cursor: "[]" })).toThrow();
});
