import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { sendSpecialOrderStatusNotifications } from "./special-order-approval";

describe("Special Order status notification delivery", () => {
	test("keeps the committed outcome retryable and retries only failed channels", async () => {
		const delivery = {
			id: "delivery-1",
			eventKey: "special-order-status:evidence-1",
			eventType: "APPROVED",
			salesOrderId: 42,
			payload: {},
			customerStatus: "PENDING",
			staffStatus: "PENDING",
			inAppStatus: "PENDING",
			attempts: 0,
		};
		const db = {
			specialOrderNotificationDelivery: {
				upsert: async ({ update }: { update: { payload: unknown } }) => {
					delivery.payload = update.payload;
					return { ...delivery };
				},
				update: async ({ data }: { data: Record<string, unknown> }) => {
					Object.assign(delivery, data, {
						attempts: delivery.attempts + 1,
					});
					return { ...delivery };
				},
			},
		};
		const sendCounts = { customer: 0, staff: 0, inApp: 0 };
		let customerShouldFail = true;
		const dependencies = {
			emailService: {
				sendTransactionalWithResult: async ({ to }: { to: string }) => {
					if (to === "buyer@example.com") {
						sendCounts.customer += 1;
						if (customerShouldFail) {
							return { status: "failed" as const, errorMessage: "mail down" };
						}
					} else {
						sendCounts.staff += 1;
					}
					return { status: "sent" as const };
				},
			},
			sendInApp: async () => {
				sendCounts.inApp += 1;
			},
		};
		const input = {
			eventId: "evidence-1",
			eventType: "APPROVED" as const,
			salesId: 42,
			orderNo: "S-42",
			customer: { name: "Customer", email: "buyer@example.com" },
			salesRep: { id: 9, name: "Rep", email: "rep@example.com" },
			customerHeadline: "Special Order approved",
			customerMessage: "Approved",
			staffHeadline: "Customer approved Special Order",
			staffMessage: "Approved",
			sendCustomer: true,
		};
		const ctx = { db } as unknown as TRPCContext;

		const first = await sendSpecialOrderStatusNotifications(
			ctx,
			input,
			dependencies,
		);
		expect(first.retryable).toBe(true);
		expect(first.customer).toBe("failed");
		expect(first.staff).toBe("sent");
		expect(sendCounts).toEqual({ customer: 1, staff: 1, inApp: 1 });

		customerShouldFail = false;
		const retry = await sendSpecialOrderStatusNotifications(
			ctx,
			input,
			dependencies,
		);
		expect(retry.retryable).toBe(false);
		expect(retry.customer).toBe("sent");
		expect(sendCounts).toEqual({ customer: 2, staff: 1, inApp: 1 });
		expect(delivery.attempts).toBe(2);
	});
});
