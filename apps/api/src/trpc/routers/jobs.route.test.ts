import { describe, expect, it, spyOn } from "bun:test";
import { reviewJobStatus } from "./jobs.route";

describe("reviewJobStatus", () => {
	it("returns the status update when activity and notification side effects fail", async () => {
		const updates: any[] = [];
		const errorSpy = spyOn(console, "error").mockImplementation(() => {});
		const logSpy = spyOn(console, "log").mockImplementation(() => {});
		const db = {
			jobs: {
				update: async (args: any) => {
					updates.push(args);
					return {
						id: args.where.id,
						controlId: null,
						userId: 25,
						status: args.data.status,
						statusDate: args.data.statusDate,
					};
				},
			},
			users: {
				findMany: async () => {
					throw new Error("activity lookup unavailable");
				},
				findFirst: async () => ({ id: 7 }),
			},
		};

		try {
			const result = await reviewJobStatus(
				{ db, userId: 7 } as any,
				{
					action: "approve",
					jobId: 42,
					note: "Ready for payment.",
				},
				{
					notificationTasks: {
						trigger: async () => {
							throw new Error("notification queue unavailable");
						},
					},
				},
			);

			expect(result.status).toBe("Approved");
			expect(updates[0]).toMatchObject({
				where: {
					id: 42,
				},
				data: {
					status: "Approved",
				},
			});
			expect(errorSpy).toHaveBeenCalled();
		} finally {
			errorSpy.mockRestore();
			logSpy.mockRestore();
		}
	});
});
