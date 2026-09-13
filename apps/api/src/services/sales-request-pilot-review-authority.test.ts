import { describe, expect, test } from "bun:test";
import { requireNamedActiveSalesRequestPilotReviewer } from "./sales-request-pilot-review-authority";

type ReviewerDatabase = Parameters<
	typeof requireNamedActiveSalesRequestPilotReviewer
>[0]["db"];

function reviewerDb(activeUserId: number | null): ReviewerDatabase {
	return {
		users: {
			findFirst: async () =>
				activeUserId === null ? null : { id: activeUserId },
		},
	} as ReviewerDatabase;
}

describe("sales request pilot reviewer authority", () => {
	test("allows only an active reviewer named by the current pilot", async () => {
		await expect(
			requireNamedActiveSalesRequestPilotReviewer({
				db: reviewerDb(42),
				userId: 42,
				reviewerUserIds: [42],
			}),
		).resolves.toBeUndefined();

		await expect(
			requireNamedActiveSalesRequestPilotReviewer({
				db: reviewerDb(42),
				userId: 19,
				reviewerUserIds: [42],
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		await expect(
			requireNamedActiveSalesRequestPilotReviewer({
				db: reviewerDb(null),
				userId: 42,
				reviewerUserIds: [42],
			}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});
