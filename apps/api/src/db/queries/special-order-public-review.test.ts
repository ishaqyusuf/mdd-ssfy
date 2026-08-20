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
			billingAddress: {
				name: "Billing contact",
				address1: "10 Billing Street",
				city: "Dallas",
				state: "TX",
				meta: { zip_code: "75201" },
			},
			shippingAddress: {
				name: "Shipping contact",
				address1: "20 Shipping Street",
				city: "Austin",
				state: "TX",
				meta: { zip_code: "78701" },
			},
			lineItems: [
				{
					uid: "line-1",
					title: "Snapshot door",
					description: "Snapshot door",
					qty: 1,
					unitPrice: 250,
					lineTotal: 250,
					formSteps: [
						{
							step: { id: 1, title: "Item Type" },
							value: "Interior",
						},
					],
					shelfItems: [
						{ description: "Trim", qty: 2, unitPrice: 10, totalPrice: 20 },
					],
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
								lineTotal: 230,
								stepProduct: { name: "Snapshot Carrara" },
							},
						],
					},
					meta: {
						serviceRows: [{ service: "Install", qty: 1, unitPrice: 80 }],
					},
				},
			],
			extraCosts: [],
			summary: { subTotal: 250, grandTotal: 250 },
		},
		customerSnapshot: {
			businessName: "Snapshot Customer",
			email: "snapshot@example.test",
			phoneNo: "555-0100",
		},
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

	it("loads current canonical sales data on every open and ignores document snapshots", async () => {
		const currentInvoicePage = {
			meta: {
				title: "Invoice",
				salesNo: "S-42",
				date: "Aug 19, 2026",
				total: "$250.00",
			},
			billing: { title: "Sold To", lines: ["CURRENT CUSTOMER"] },
			shipping: { title: "Ship To", lines: ["CURRENT CUSTOMER"] },
			sections: [{ kind: "line-item", title: "Current sales line" }],
			footer: null,
			config: { mode: "invoice" },
			signing: null,
			specialOrder: null,
		};
		const capturedInvoicePage = {
			...currentInvoicePage,
			sections: [{ kind: "line-item", title: "Captured stale line" }],
		};
		const fake = context(
			request({
				orderSnapshot: {
					...request().orderSnapshot,
					documentSnapshot: {
						version: 1,
						templateId: "template-2",
						invoicePage: capturedInvoicePage,
						companyAddress: {
							address1: "Captured address",
							address2: "Captured city",
							phone: "555-0100",
						},
						logoUrl: "https://example.test/captured-logo.png",
					},
				},
			}),
		);
		let loadCount = 0;
		const dependencies = {
			loadPrintDocumentData: async () => {
				loadCount += 1;
				return {
					pages: [currentInvoicePage],
					title: "Invoice S-42",
					firstOrderId: "S-42",
					companyAddress: { address1: "Current company address" },
					logoUrl: "https://example.test/current-logo.png",
				} as never;
			},
		};

		const first = await getPublicSpecialOrderApproval(
			fake.ctx as never,
			"valid-token",
			dependencies,
		);
		await getPublicSpecialOrderApproval(
			fake.ctx as never,
			"valid-token",
			dependencies,
		);

		expect(loadCount).toBe(2);
		expect(first).toMatchObject({
			state: "ACTIVE",
			customerName: "Mutable Customer",
			salespersonName: "Mutable Salesperson",
			templateId: "template-2",
			logoUrl: "https://example.test/current-logo.png",
			companyAddress: { address1: "Current company address" },
			order: { invoicePage: currentInvoicePage },
		});
		expect(JSON.stringify(first)).not.toContain("Captured stale line");
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
