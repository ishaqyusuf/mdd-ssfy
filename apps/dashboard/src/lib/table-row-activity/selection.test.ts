import { expect, it } from "bun:test";
import { clearCompletedRowSelection } from "./selection";
it("clears only committed rows while preserving retries and later selections", () => {
	expect(
		clearCompletedRowSelection(
			{ succeeded: true, failed: true, later: true },
			new Set(["succeeded"]),
		),
	).toEqual({ failed: true, later: true });
});
