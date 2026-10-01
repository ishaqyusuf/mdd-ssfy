import { describe, expect, it } from "bun:test";
import { getJobSaveAction } from "./job-form-actions";

describe("job form save intent", () => {
	it("preserves the existing status when an admin edits a job", () => {
		expect(
			getJobSaveAction({
				isSubmitMode: false,
				markAsComplete: false,
				jobId: 101,
			}),
		).toBe("update");
	});
	it("assigns newly created work and submits explicitly completed work", () => {
		expect(
			getJobSaveAction({ isSubmitMode: false, markAsComplete: false }),
		).toBe("re-assign");
		expect(
			getJobSaveAction({
				isSubmitMode: false,
				markAsComplete: true,
				jobId: 101,
			}),
		).toBe("submit");
		expect(
			getJobSaveAction({
				isSubmitMode: true,
				markAsComplete: false,
				jobId: 101,
			}),
		).toBe("submit");
	});
});
