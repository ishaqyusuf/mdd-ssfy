import { beforeEach, describe, expect, it, mock } from "bun:test";

const createNotification = mock(async () => ({ activities: 1 }));
import { sendDispatchLifecycleNotification } from "./dispatch-lifecycle-notification";

describe("dispatch lifecycle notifications", () => {
	beforeEach(() => createNotification.mockClear());

	it.each([
		"sales_dispatch_assigned",
		"sales_dispatch_approval_pending_released",
		"sales_dispatch_unassigned",
		"sales_dispatch_date_updated",
	] as const)("delivers %s directly to the driver inbox", async (channel) => {
		await expect(
			sendDispatchLifecycleNotification(
				{} as Parameters<typeof sendDispatchLifecycleNotification>[0],
				1,
				55,
				channel,
				{
					orderNo: "09439PC",
					dispatchId: 4602,
					deliveryMode: "delivery",
					dueDate: new Date("2026-09-04T00:00:00.000Z"),
						driverId: 55,
					},
					{ create: createNotification } as never,
				),
		).resolves.toMatchObject({ sent: true });
		expect(createNotification).toHaveBeenCalledTimes(1);
		expect(createNotification.mock.calls[0]?.[0]).toBe(channel);
		expect(createNotification.mock.calls[0]?.[2]).toMatchObject({
			author: { id: 1, role: "employee" },
			recipients: [{ ids: [55], role: "employee" }],
			includeChannelSubscribers: false,
			allowFallbackRecipient: false,
			forceInAppRecipients: true,
		});
	});

	it("does not create an activity without a recipient", async () => {
		await expect(
			sendDispatchLifecycleNotification(
				{} as Parameters<typeof sendDispatchLifecycleNotification>[0],
				1,
				null,
				"sales_dispatch_assigned",
				{ dispatchId: 4602 },
			),
		).resolves.toEqual({ sent: false, reason: "NO_RECIPIENT" });
		expect(createNotification).not.toHaveBeenCalled();
	});
});
