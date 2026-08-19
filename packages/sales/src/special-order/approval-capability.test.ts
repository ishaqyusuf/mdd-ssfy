import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import {
	ensureSpecialOrderEmailApprovalAction,
	createSpecialOrderApprovalCapability,
	hashSpecialOrderApprovalCapability,
	recordSpecialOrderApprovalDelivery,
	resolveCurrentSpecialOrderApprovalLink,
} from "./approval-capability";

function storedTokenHash(requestId: string) {
	return hashSpecialOrderApprovalCapability(
		createSpecialOrderApprovalCapability(requestId),
	);
}

function createDbFixture(input?: {
	activeExpiresAt?: Date;
	activeTokenHash?: string;
	canonicalCustomerEmail?: string | null;
}) {
	const requests: Array<Record<string, unknown>> = [];
	if (input?.activeExpiresAt) {
		requests.push({
			id: "active-request",
			salesOrderId: 42,
			orderRevision: "revision-1",
			status: "ACTIVE",
			tokenHash:
				input.activeTokenHash ?? storedTokenHash("active-request"),
			expiresAt: input.activeExpiresAt,
			createdAt: new Date("2026-08-13T12:00:00.000Z"),
		});
	}
	let historyCount = 0;
	const fixture = {
		settings: {
			findFirst: async () => ({
				id: 1,
				type: "sales-settings",
				meta: {
					specialOrder: {
						activePolicyVersionId: "policy-1",
						approvalLinkLifetimeDays: 7,
					},
				},
			}),
			create: async () => null,
			update: async () => null,
		},
		specialOrderPolicyVersion: {
			findFirst: async () => ({ id: "policy-1", version: 1 }),
			upsert: async () => null,
		},
		salesOrders: {
			findFirst: async () => ({
				id: 42,
				orderId: "S-42",
				specialOrderDeclaration: "YES",
				specialOrderStatus: "SIGNATURE_PENDING",
				specialOrderRevision: "revision-1",
				currentSpecialOrderApprovalId: null,
				meta: { newSalesForm: { form: {}, lineItems: [], summary: {} } },
				customer: {
					id: 7,
					name: "Customer",
					email:
						input && "canonicalCustomerEmail" in input
							? input.canonicalCustomerEmail
							: "buyer@example.com",
				},
				salesRep: { id: 9, name: "Rep", email: "rep@example.com" },
			}),
			update: async () => null,
		},
		specialOrderApprovalEvidence: {
			findFirst: async () => null,
		},
		specialOrderApprovalRequest: {
			findFirstOrThrow: async () => requests.at(-1),
			findFirst: async ({ where }: { where: { expiresAt: { gt: Date } } }) =>
				requests
					.filter(
						(request) =>
							request.status === "ACTIVE" &&
							(request.expiresAt as Date) > where.expiresAt.gt,
					)
					.at(-1) ?? null,
			updateMany: async () => {
				for (const request of requests) {
					if (request.status === "ACTIVE") request.status = "REVOKED";
				}
				return { count: requests.length };
			},
			create: async ({ data }: { data: Record<string, unknown> }) => {
				const created = {
					...data,
					status: "ACTIVE",
					createdAt: new Date(),
				};
				requests.push(created);
				return created;
			},
		},
		salesHistory: {
			create: async () => {
				historyCount += 1;
				return {};
			},
		},
		$transaction: async (task: (tx: unknown) => Promise<unknown>) =>
			task(fixture),
	};

	return {
		db: fixture as unknown as Db,
		requests,
		getHistoryCount: () => historyCount,
	};
}

describe("Special Order approval capability issuance", () => {
	test("does not reuse an active link signed by another environment", async () => {
		const db = {
			salesOrders: {
				findFirst: async () => ({
					orderId: "S-42",
					specialOrderDeclaration: "YES",
					specialOrderRevision: "revision-1",
					currentSpecialOrderRequestId: "active-request",
				}),
			},
			specialOrderApprovalRequest: {
				findFirst: async () => ({
					id: "active-request",
					tokenHash: "foreign-environment-token-hash",
					expiresAt: new Date(Date.now() + 60_000),
				}),
			},
		} as unknown as Db;

		await expect(
			resolveCurrentSpecialOrderApprovalLink(db, 42),
		).resolves.toBeNull();
	});

	test("fails closed when the canonical customer email is invalid", async () => {
		const fixture = createDbFixture({
			canonicalCustomerEmail: "missing-at-sign",
		});
		await expect(
			ensureSpecialOrderEmailApprovalAction(fixture.db, {
				salesId: 42,
				issuedByUserId: 9,
			}),
		).rejects.toThrow("SPECIAL_ORDER_CUSTOMER_EMAIL_REQUIRED");
		expect(fixture.requests).toHaveLength(0);
	});

	test("reuses the active unexpired revision capability without duplicate activity", async () => {
		const fixture = createDbFixture({
			activeExpiresAt: new Date(Date.now() + 60_000),
		});
		const action = await ensureSpecialOrderEmailApprovalAction(fixture.db, {
			salesId: 42,
			issuedByUserId: 9,
		});

		expect(action?.requestId).toBe("active-request");
		expect(action?.newlyIssued).toBe(false);
		expect(fixture.requests).toHaveLength(1);
		expect(fixture.getHistoryCount()).toBe(0);
	});

	test("rotates an active capability signed by another environment", async () => {
		const fixture = createDbFixture({
			activeExpiresAt: new Date(Date.now() + 60_000),
			activeTokenHash: "foreign-environment-token-hash",
		});
		const action = await ensureSpecialOrderEmailApprovalAction(fixture.db, {
			salesId: 42,
			issuedByUserId: 9,
		});

		expect(action?.newlyIssued).toBe(true);
		expect(action?.requestId).not.toBe("active-request");
		expect(fixture.requests).toHaveLength(2);
		expect(fixture.requests[0]?.status).toBe("REVOKED");
		expect(fixture.requests[1]?.status).toBe("ACTIVE");
		expect(fixture.getHistoryCount()).toBe(1);
	});

	test("revokes an expired capability, issues one replacement, then reuses it", async () => {
		const fixture = createDbFixture({
			activeExpiresAt: new Date(Date.now() - 60_000),
		});
		const first = await ensureSpecialOrderEmailApprovalAction(fixture.db, {
			salesId: 42,
			issuedByUserId: 9,
		});
		const second = await ensureSpecialOrderEmailApprovalAction(fixture.db, {
			salesId: 42,
			issuedByUserId: 9,
		});

		expect(first?.newlyIssued).toBe(true);
		expect(second?.requestId).toBe(first?.requestId);
		expect(second?.newlyIssued).toBe(false);
		expect(fixture.requests).toHaveLength(2);
		expect(fixture.requests.filter((request) => request.status === "ACTIVE"))
			.toHaveLength(1);
		expect(fixture.getHistoryCount()).toBe(1);
	});

	test("does not embed a rendered document snapshot in the approval request", async () => {
		const fixture = createDbFixture();
		await ensureSpecialOrderEmailApprovalAction(fixture.db, {
			salesId: 42,
			issuedByUserId: 9,
		});

		expect(
			(fixture.requests[0]?.orderSnapshot as Record<string, unknown>)
				.documentSnapshot,
		).toBeUndefined();
	});

	test("records delivery from a Sales-document email on every included request", async () => {
		let update: unknown = null;
		const db = {
			specialOrderApprovalRequest: {
				updateMany: async (input: unknown) => {
					update = input;
					return { count: 2 };
				},
			},
		} as unknown as Db;
		await recordSpecialOrderApprovalDelivery(
			db,
			[
				{
					requestId: "request-1",
					orderId: "S-1",
					recipientEmail: "buyer@example.com",
					approvalUrl: "https://example.com/1",
					expiresAt: new Date(),
					newlyIssued: true,
				},
				{
					requestId: "request-2",
					orderId: "S-2",
					recipientEmail: "buyer@example.com",
					approvalUrl: "https://example.com/2",
					expiresAt: new Date(),
					newlyIssued: true,
				},
			],
			{ status: "sent", providerMessageId: "provider-1" },
		);
		expect(update).toMatchObject({
			where: { id: { in: ["request-1", "request-2"] } },
			data: { deliveryStatus: "SENT", deliveredAt: expect.any(Date) },
		});
	});
});
