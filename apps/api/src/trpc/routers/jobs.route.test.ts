import { describe, expect, it, spyOn } from "bun:test";
import { deleteJob, reviewJobStatus } from "./jobs.route";

function createDeleteJobTestContext({
	userId = 25,
	job = {
		id: 42,
		userId: 25,
		status: "Submitted",
		paymentId: null,
		approvedAt: null,
	},
	roleName = "1099 Contractor",
}: {
	userId?: number;
	job?: any;
	roleName?: string;
} = {}) {
	const updates: any[] = [];
	const notifications: any[] = [];
	const db = {
		jobs: {
			findFirst: async () => job,
			update: async (args: any) => {
				updates.push(args);
				return { id: args.where.id };
			},
		},
		users: {
			findFirstOrThrow: async () => ({
				id: userId,
				email: "worker@example.com",
				name: "Worker",
				phoneNo: null,
				roles: [
					{
						role: {
							id: 1,
							name: roleName,
						},
					},
				],
			}),
			findFirst: async () => ({ id: userId }),
		},
		roles: {
			findFirstOrThrow: async () => ({
				name: roleName,
				RoleHasPermissions: [],
			}),
		},
		modelHasPermissions: {
			findMany: async () => [],
		},
	};
	const notificationTasks = {
		trigger: async (_taskId: string, payload: any) => {
			notifications.push(payload);
		},
	};

	return {
		ctx: { db, userId } as any,
		updates,
		notifications,
		notificationTasks,
	};
}

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

describe("deleteJob", () => {
	it("soft deletes a submitted job owned by the signed-in contractor", async () => {
		const { ctx, updates, notifications, notificationTasks } =
			createDeleteJobTestContext();

		await deleteJob(ctx, { id: 42 }, { notificationTasks });

		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({
			where: { id: 42 },
		});
		expect(updates[0].data.deletedAt).toBeInstanceOf(Date);
		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toMatchObject({
			channel: "job_deleted",
			payload: {
				jobId: 42,
			},
		});
	});

	it("allows a jobs admin to delete an unlocked job assigned to another user", async () => {
		const { ctx, updates, notificationTasks } = createDeleteJobTestContext({
			userId: 7,
			job: {
				id: 42,
				userId: 25,
				status: "Submitted",
				paymentId: null,
				approvedAt: null,
			},
			roleName: "Super Admin",
		});

		await deleteJob(ctx, { id: 42 }, { notificationTasks });

		expect(updates).toHaveLength(1);
	});

	it("rejects deleting another contractor's job without editJobs permission", async () => {
		const { ctx, updates, notificationTasks } = createDeleteJobTestContext({
			userId: 7,
			job: {
				id: 42,
				userId: 25,
				status: "Submitted",
				paymentId: null,
				approvedAt: null,
			},
		});

		await expect(
			deleteJob(ctx, { id: 42 }, { notificationTasks }),
		).rejects.toThrow("You do not have permission to delete this job.");
		expect(updates).toHaveLength(0);
	});

	it("rejects approved and payout-linked jobs", async () => {
		const approved = createDeleteJobTestContext({
			job: {
				id: 42,
				userId: 25,
				status: "Approved",
				paymentId: null,
				approvedAt: null,
			},
		});
		const paid = createDeleteJobTestContext({
			job: {
				id: 43,
				userId: 25,
				status: "Submitted",
				paymentId: 12,
				approvedAt: null,
			},
		});

		await expect(
			deleteJob(approved.ctx, { id: 42 }, {
				notificationTasks: approved.notificationTasks,
			}),
		).rejects.toThrow("Approved or paid jobs cannot be deleted.");
		await expect(
			deleteJob(paid.ctx, { id: 43 }, {
				notificationTasks: paid.notificationTasks,
			}),
		).rejects.toThrow("This job is already tied to a contractor payout.");
		expect(approved.updates).toHaveLength(0);
		expect(paid.updates).toHaveLength(0);
	});
});
