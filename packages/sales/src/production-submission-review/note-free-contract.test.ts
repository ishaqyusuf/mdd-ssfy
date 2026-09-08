import { expect, test } from "bun:test";
import { decideProductionSubmissionMaterialReviewSchema } from "./contracts";

test("material approval accepts no user-written decision note", () => {
	const result = decideProductionSubmissionMaterialReviewSchema.safeParse({
		reviewId: 395,
		expectedUpdatedAt: new Date(),
		action: "RECHECK_AND_APPROVE",
	});
	expect(result.success).toBe(true);
});
