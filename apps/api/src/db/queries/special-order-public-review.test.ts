import { describe, expect, it } from "bun:test";
import { TRPCError } from "@trpc/server";

import { getPublicSpecialOrderApproval } from "./special-order-approval";

function context(request: Record<string, unknown> | null) {
	const events: unknown[] = [];
	return {
		events,
		ctx: {
			db: {
				specialOrderApprovalRequest: {
					findUnique: async () => request,
				},
				specialOrderOperationEvent: {
					upsert: async (input: unknown) => {
						events.push(input);
						return input;
					},
				},
			},
		},
	};
}

function request(overrides: Record<string, unknown> = {}) {
	return {
		id: "request-1",
		salesOrderId: 42,
		orderRevision: "revision-1",
		status: "ACTIVE",
		expiresAt: new Date(Date.now() + 60_000),
		consumedAt: null,
		evidence: null,
		policyVersion: {
			version: 3,
			title: "Special Order",
			acknowledgmentText: "I reviewed the complete order.",
			policyText: "Special and custom items cannot be returned or refunded.",
		},
		orderSnapshot: {
			form: { po: "SNAPSHOT-PO" },
			lineItems: [
				{
					uid: "line-1",
					title: "Snapshot door",
					qty: 1,
					unitPrice: 250,
					shelfItems: [{ description: "Trim", qty: 2, unitPrice: 10 }],
					housePackageTool: {
						doors: [
							{
								dimension: "36 x 80",
								doorType: "Interior Pre-Hung Door",
								swing: "RH",
								lhQty: 0,
								rhQty: 1,
								totalQty: 1,
								unitPrice: 230,
							},
						],
					},
					meta: {
						serviceRows: [{ service: "Install", qty: 1, unitPrice: 80 }],
					},
				},
			],
			extraCosts: [],
			summary: { grandTotal: 250 },
		},
		customerSnapshot: { businessName: "Snapshot Customer" },
		salespersonSnapshot: { name: "Snapshot Salesperson" },
		order: {
			orderId: "S-42",
			specialOrderDeclaration: "YES",
			specialOrderRevision: "revision-1",
			meta: {
				newSalesForm: {
					form: { po: "MUTABLE-PO" },
					lineItems: [{ uid: "line-2", title: "Mutable line" }],
					extraCosts: [],
					summary: { grandTotal: 999 },
				},
			},
			customer: { name: "Mutable Customer", businessName: null, email: null },
			salesRep: { name: "Mutable Salesperson" },
		},
		...overrides,
	};
}

describe("Special Order public review boundary", () => {
	it("reveals no order data for an invalid capability", async () => {
		const fake = context(null);
		const error = await getPublicSpecialOrderApproval(
			fake.ctx as never,
			"invalid-token",
		).catch((caught) => caught);
		expect(error).toBeInstanceOf(TRPCError);
		expect(error.code).toBe("NOT_FOUND");
		expect(error.message).not.toContain("S-42");
	});

	it("renders the immutable issued snapshot instead of mutable order metadata", async () => {
		const fake = context(request());
		const result = await getPublicSpecialOrderApproval(
			fake.ctx as never,
			"valid-token",
		);
		expect(result).toMatchObject({
			state: "ACTIVE",
			customerName: "Snapshot Customer",
			salespersonName: "Snapshot Salesperson",
			order: {
				form: { po: "SNAPSHOT-PO" },
				lineItems: [
					{
						title: "Snapshot door",
						unitPrice: 250,
						shelfItems: [{ description: "Trim" }],
						housePackageTool: {
							doors: [
								{
									dimension: "36 x 80",
									doorType: "Interior Pre-Hung Door",
									swing: "RH",
									lhQty: 0,
									rhQty: 1,
								},
							],
						},
						meta: { serviceRows: [{ service: "Install" }] },
					},
				],
				summary: { grandTotal: 250 },
			},
		});
	});

	it("returns minimal terminal states and records stale-link telemetry", async () => {
		const stale = context(
			request({
				order: {
					...request().order,
					specialOrderRevision: "revision-2",
				},
			}),
		);
		const result = await getPublicSpecialOrderApproval(
			stale.ctx as never,
			"stale-token",
		);
		expect(result).toEqual({
			state: "STALE",
			message:
				"The order has changed. Request the current approval link from your salesperson.",
		});
		expect(stale.events).toHaveLength(1);
	});
});
