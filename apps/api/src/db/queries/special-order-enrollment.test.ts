import { describe, expect, test } from "bun:test";
import { enrollSpecialOrderFromOverview } from "./special-order-enrollment";

function createFixture(input?: {
	canEnroll?: boolean;
	declaration?: "NO" | "YES" | null;
	email?: string | null;
}) {
	const calls: Record<string, any> = {};
	const order = {
		id: 31,
		slug: "order-09331ad",
		orderId: "09331AD",
		dealerAuthId: null,
		customerId: 14,
		customerProfileId: null,
		billingAddressId: null,
		shippingAddressId: null,
		specialOrderDeclaration: input?.declaration ?? "NO",
		specialOrderStatus:
			(input?.declaration ?? "NO") === "YES"
				? "CUSTOMER_APPROVED"
				: "NOT_REQUIRED",
		specialOrderRevision:
			(input?.declaration ?? "NO") === "YES" ? "revision-existing" : null,
		currentSpecialOrderApprovalId:
			(input?.declaration ?? "NO") === "YES" ? "approval-existing" : null,
		currentSpecialOrderRequestId: null,
		customer: {
			id: 14,
			name: "Ada Customer",
			businessName: null,
			email: input?.email === undefined ? "ada@example.com" : input.email,
			phoneNo: "555-0100",
			phoneNo2: null,
			address: "1 Main Street",
			deletedAt: null,
		},
	};
	const db: Record<string, any> = {
		salesOrders: {
			findFirst: async () => order,
			update: async (args: Record<string, any>) => {
				calls.orderUpdate = args;
				return args.data;
			},
		},
		customerTypes: { findFirst: async () => null },
		addressBooks: { findFirst: async () => null },
		users: { findFirst: async () => ({ name: "Sales Person" }) },
		specialOrderApprovalRequest: {
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
				calls.history = args;
				return { id: 91 };
			},
		},
	};
	db.$transaction = async (run: (client: typeof db) => Promise<unknown>) =>
		run(db);
	const dependencies = {
		loadSalesForm: async () => ({
			salesId: order.id,
			type: "order",
			form: { createdAt: "2026-08-17T10:00:00.000Z" },
			lineItems: [
				{
					uid: "line-1",
					title: "Custom door",
					qty: 1,
					unitPrice: 920,
					lineTotal: 920,
					formSteps: [],
					shelfItems: [],
					housePackageTool: null,
					meta: {},
				},
			],
			extraCosts: [],
			summary: {
				subTotal: 920,
				adjustedSubTotal: 920,
				taxRate: 0,
				taxTotal: 0,
				grandTotal: 920,
				totalWithCcc: 920,
				ccc: 0,
			},
		}),
		getEnrollmentAccess: async () => ({
			releaseAudience: "ALL_STAFF",
			canEnroll: input?.canEnroll ?? true,
		}),
		getActivitySenderContactId: async () => 72,
		createTimelineActivity: async (_db: unknown, args: Record<string, any>) => {
			calls.timeline = args;
		},
		refreshDocuments: async (args: Record<string, any>) => {
			calls.refreshDocuments = args;
			return { expiry: null, warmups: [] };
		},
	};
	return {
		calls,
		ctx: { db, userId: 9 } as any,
		dependencies: dependencies as any,
	};
}

describe("Sales Overview Special Order enrollment", () => {
	test("enrolls the current persisted projection without sending approval", async () => {
		const fixture = createFixture();
		const result = await enrollSpecialOrderFromOverview(
			fixture.ctx,
			{ salesId: 31 },
			fixture.dependencies,
		);

		expect(result).toMatchObject({
			enrolled: true,
			salesId: 31,
			orderId: "09331AD",
			status: "SIGNATURE_PENDING",
		});
		expect(result.revision).toHaveLength(64);
		expect(fixture.calls.orderUpdate.data).toMatchObject({
			specialOrderDeclaration: "YES",
			specialOrderStatus: "SIGNATURE_PENDING",
			currentSpecialOrderApprovalId: null,
			currentSpecialOrderRequestId: null,
		});
		expect(fixture.calls.requestUpdate.data.status).toBe("REVOKED");
		expect(fixture.calls.evidenceUpdate.data).toMatchObject({
			supersededReason: "Special Order re-enrolled",
			supersededByUserId: 9,
		});
		expect(fixture.calls.timeline.copy).toMatchObject({
			activityType: "special_order_enabled",
		});
		expect(fixture.calls.timeline.copy.note).toBe("No reason provided.");
		expect(fixture.calls.history.data.data).toMatchObject({
			outcome: "SIGNATURE_PENDING",
			reason: null,
			source: "sales_overview",
		});
		expect(fixture.calls.refreshDocuments.reason).toBe(
			"special_order_enrolled_from_overview",
		);
	});

	test("denies actors outside the live enrollment audience", async () => {
		const fixture = createFixture({ canEnroll: false });
		await expect(
			enrollSpecialOrderFromOverview(
				fixture.ctx,
				{ salesId: 31, reason: "Custom configuration" },
				fixture.dependencies,
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(fixture.calls.orderUpdate).toBeUndefined();
	});

	test("requires canonical customer email before any enrollment write", async () => {
		const fixture = createFixture({ email: null });
		await expect(
			enrollSpecialOrderFromOverview(
				fixture.ctx,
				{ salesId: 31, reason: "Custom configuration" },
				fixture.dependencies,
			),
		).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
			message: expect.stringContaining("SPECIAL_ORDER_CUSTOMER_EMAIL_REQUIRED"),
		});
		expect(fixture.calls.orderUpdate).toBeUndefined();
	});

	test("is idempotent when the order is already governed", async () => {
		const fixture = createFixture({ declaration: "YES" });
		const result = await enrollSpecialOrderFromOverview(
			fixture.ctx,
			{ salesId: 31, reason: "Custom configuration" },
			fixture.dependencies,
		);
		expect(result).toEqual({
			enrolled: false,
			salesId: 31,
			orderId: "09331AD",
			status: "CUSTOMER_APPROVED",
			revision: "revision-existing",
		});
		expect(fixture.calls.orderUpdate).toBeUndefined();
		expect(fixture.calls.refreshDocuments).toBeUndefined();
	});
});
