import { describe, expect, it, mock } from "bun:test";
import { authorizeMobileNotification } from "./mobile-notification-authority";

function makeDb() {
	return {
		jobs: {
			findFirst: mock(async () => ({ id: 51, userId: 22 })),
		},
		orderDelivery: {
			findFirst: mock(async () => ({
				id: 41,
				driverId: 7,
				deliveryMode: "delivery",
				dueDate: new Date("2026-08-25T12:00:00.000Z"),
				order: { orderId: "ORDER-41" },
			})),
		},
	};
}

describe("mobile notification authority", () => {
	it("rejects every non-allowlisted client notification channel", async () => {
		await expect(
			authorizeMobileNotification(
				makeDb() as any,
				{
					channel: "employee_access_revoked",
					payload: { userId: 22 },
				} as any,
				{ userId: 7, can: { editJobs: true } },
			),
		).rejects.toThrow("not supported");
	});

	it("derives the contractor and recipient from the authorized persisted job", async () => {
		const result = await authorizeMobileNotification(
			makeDb() as any,
			{
				channel: "job_task_configured",
				author: { id: 999, role: "employee" },
				recipients: [{ ids: [999], role: "employee" }],
				payload: { jobId: 51, contractorId: 999 },
			},
			{ userId: 7, can: { editJobs: true } },
		);

		expect(result).toEqual({
			channel: "job_task_configured",
			payload: { jobId: 51, contractorId: 22 },
			recipientIds: [22],
		});
	});

	it("rejects job status notifications without job-management permission", async () => {
		await expect(
			authorizeMobileNotification(
				makeDb() as any,
				{
					channel: "job_task_configured",
					author: { id: 7, role: "employee" },
					payload: { jobId: 51, contractorId: 22 },
				} as any,
				{ userId: 7, can: {} },
			),
		).rejects.toThrow("permission to configure contractor jobs");
	});

	it("derives dispatch scope and strips forged recipients for the assigned driver", async () => {
		const result = await authorizeMobileNotification(
			makeDb() as any,
			{
				channel: "sales_dispatch_packing_reset",
				author: { id: 999, role: "employee" },
				recipients: [{ ids: [999], role: "employee" }],
				payload: { dispatchId: 41, orderNo: "FORGED", driverId: 999 },
			},
			{ userId: 7, can: { viewDelivery: true } },
		);

		expect(result.channel).toBe("sales_dispatch_packing_reset");
		expect(result.recipientIds).toBeNull();
		expect(result.payload).toEqual({
			orderNo: "ORDER-41",
			dispatchId: 41,
			deliveryMode: "delivery",
			dueDate: new Date("2026-08-25T12:00:00.000Z"),
			driverId: 7,
		});
	});

	it("rejects an unassigned dispatch actor", async () => {
		await expect(
			authorizeMobileNotification(
				makeDb() as any,
				{
					channel: "sales_dispatch_duplicate_alert",
					author: { id: 8, role: "employee" },
					payload: { dispatchId: 41 },
				} as any,
				{ userId: 8, can: { viewDelivery: true } },
			),
		).rejects.toThrow("assigned driver");
	});
});
