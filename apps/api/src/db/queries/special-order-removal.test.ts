import { describe, expect, test } from "bun:test";

import { removeSpecialOrderClassification } from "./special-order-approval";

function createHarness(input: {
	communicated: number;
	status: "SIGNATURE_PENDING" | "CUSTOMER_APPROVED" | "CUSTOMER_DECLINED";
	customerEmail?: string | null;
}) {
	const calls = {
		historyCreate: null as null | Record<string, any>,
		historyUpdate: null as null | Record<string, any>,
		notification: null as null | Record<string, any>,
		requestUpdate: null as null | Record<string, any>,
		evidenceUpdate: null as null | Record<string, any>,
		orderUpdate: null as null | Record<string, any>,
	};
	const order = {
		id: 9232,
		orderId: "09232PC",
		specialOrderDeclaration: "YES",
		specialOrderStatus: input.status,
		specialOrderRevision: "revision-before-removal",
		currentSpecialOrderApprovalId:
			input.status === "CUSTOMER_APPROVED" ? "approval-1" : null,
		customer: {
			name: "Sample Customer",
			businessName: null,
			email: input.customerEmail ?? "customer@example.com",
		},
		salesRep: { id: 7, name: "Sales Rep", email: "rep@example.com" },
	};
	const tx = {
		salesOrders: {
			findFirst: async () => order,
			update: async (args: Record<string, any>) => {
				calls.orderUpdate = args;
			},
		},
		specialOrderApprovalRequest: {
			count: async () => input.communicated,
			updateMany: async (args: Record<string, any>) => {
				calls.requestUpdate = args;
			},
		},
		specialOrderApprovalEvidence: {
			updateMany: async (args: Record<string, any>) => {
				calls.evidenceUpdate = args;
			},
		},
		salesHistory: {
			create: async (args: Record<string, any>) => {
				calls.historyCreate = args;
				return { id: 88 };
			},
		},
	};
	const db = {
		$transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx),
		salesHistory: {
			update: async (args: Record<string, any>) => {
				calls.historyUpdate = args;
			},
		},
		users: {
			findFirst: async () => ({ name: "Authorized Salesperson" }),
		},
	};
	const sendNotifications = async (_ctx: unknown, args: Record<string, any>) => {
		calls.notification = args;
		return {
			customer: args.sendCustomer && input.customerEmail !== null ? "sent" : "skipped",
			staff: "sent",
			inApp: "sent",
			deliveryId: "delivery-1",
		};
	};

	return { calls, db, sendNotifications };
}

describe("Special Order classification removal", () => {
	for (const testCase of [
		{ status: "SIGNATURE_PENDING" as const, communicated: 1 },
		{ status: "CUSTOMER_APPROVED" as const, communicated: 1 },
		{ status: "CUSTOMER_DECLINED" as const, communicated: 1 },
	]) {
		test(`removes ${testCase.status}, preserves evidence, and notifies delivered lifecycles`, async () => {
			const harness = createHarness(testCase);
			const result = await removeSpecialOrderClassification(
				{ db: harness.db, userId: 42 } as never,
				{ salesId: 9232, reason: "Entered by mistake" },
				{
					sendNotifications: harness.sendNotifications as never,
					refreshDocuments: async () => undefined,
				},
			);

			expect(result).toMatchObject({
				removed: true,
				customerNotification: "sent",
			});
			expect(harness.calls.requestUpdate).toMatchObject({
				data: { status: "REVOKED", revokedReason: "SPECIAL_ORDER_REMOVED" },
			});
			expect(harness.calls.evidenceUpdate).toMatchObject({
				data: { supersededReason: "Entered by mistake", supersededByUserId: 42 },
			});
			expect(harness.calls.orderUpdate).toMatchObject({
				data: {
					specialOrderDeclaration: "NO",
					specialOrderStatus: "NOT_REQUIRED",
					currentSpecialOrderApprovalId: null,
					currentSpecialOrderRequestId: null,
				},
			});
			expect(harness.calls.historyCreate).toMatchObject({
				data: {
					data: {
						priorState: testCase.status,
						affectedRevision: "revision-before-removal",
						outcome: "NOT_REQUIRED",
					},
				},
			});
			expect(harness.calls.notification).toMatchObject({
				eventType: "REMOVED",
				sendCustomer: true,
			});
		});
	}

	test("skips customer notice when nothing was delivered but still notifies staff", async () => {
		const harness = createHarness({
			status: "SIGNATURE_PENDING",
			communicated: 0,
			customerEmail: null,
		});
		const result = await removeSpecialOrderClassification(
			{ db: harness.db, userId: 42 } as never,
			{ salesId: 9232, reason: "Never sent" },
			{
				sendNotifications: harness.sendNotifications as never,
				refreshDocuments: async () => undefined,
			},
		);

		expect(result).toMatchObject({
			removed: true,
			customerNotification: "skipped",
		});
		expect(harness.calls.notification).toMatchObject({ sendCustomer: false });
	});

	test("accepts no reason without weakening removal evidence or notification copy", async () => {
		const harness = createHarness({
			status: "CUSTOMER_APPROVED",
			communicated: 1,
		});
		await removeSpecialOrderClassification(
			{ db: harness.db, userId: 42 } as never,
			{ salesId: 9232 },
			{
				sendNotifications: harness.sendNotifications as never,
				refreshDocuments: async () => undefined,
			},
		);

		expect(harness.calls.evidenceUpdate).toMatchObject({
			data: { supersededReason: "Special Order classification removed" },
		});
		expect(harness.calls.historyCreate).toMatchObject({
			data: { data: { reason: null } },
		});
		expect(harness.calls.notification).toMatchObject({
			staffMessage:
				"The classification was removed for this order. No reason was provided.",
		});
	});
});
