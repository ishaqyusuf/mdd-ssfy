import { describe, expect, test } from "bun:test";
import { executeRegisteredAssistantTool } from "./registry";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { viewOrders: true },
};

const order = {
	id: 101,
	orderNo: "09502PC",
	type: "order",
	title: "Kitchen",
	customerId: 9,
	customerName: "Ada Millwork",
	salesRepName: "Sales Rep",
	status: "active",
	productionStatus: "in progress",
	inventoryStatus: "pending",
	invoiceStatus: "unpaid",
	deliveryOption: "delivery",
	priority: "NORMAL",
	grandTotal: "1234.56",
	amountDue: "34.56",
	orderedQuantity: "3.5",
	builtQuantity: "1",
	createdAt: "2026-09-01T00:00:00.000Z",
	updatedAt: "2026-09-02T00:00:00.000Z",
	archived: false,
	revision: "order-revision-1",
	pipeline: {
		version: "sales-pipeline/v2",
		revision: "pipeline-revision-1",
		freshness: { state: "current" as const, observedAt: null },
		headline: { code: "in_production", label: "In production", tone: "blue" },
		payment: { state: null, total: null, amountDue: null },
		material: { state: "pending", requiredQuantity: "3.5", readyQuantity: "1" },
		production: {
			state: "in_production",
			requiredQuantity: "3.5",
			completedQuantity: "1",
		},
		fulfillment: {
			state: "backlog",
			requiredQuantity: "3.5",
			deliveredQuantity: "0",
		},
		packing: { state: "pending" },
		dispatch: { state: "none" },
		blockers: [],
		conflicts: [],
	},
	deliveries: [],
	payments: [],
	statistics: [],
};

describe("Assistant PDF tools", () => {
	test("returns a ready scoped PDF as a document entity", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "documents_get_sales_pdf_status",
				version: 1,
				input: { orderNo: "09502PC", mode: "invoice" },
			},
			{
				getSalesOrderCandidates: async () => [order],
				getSalesPdfStatus: async () => ({
					mode: "invoice",
					documentType: "invoice_pdf",
					status: "ready",
					snapshotId: "snapshot-1",
					documentId: "document-1",
					generatedAt: "2026-09-02T01:00:00.000Z",
					sourceUpdatedAt: "2026-09-02T00:00:00.000Z",
					expiresAt: "2026-09-09T01:00:00.000Z",
					revision: "pdf-revision-1",
				}),
			},
		);
		expect(result).toMatchObject({
			status: "success",
			data: { pdf: { status: "ready", documentId: "document-1" } },
			entities: [
				{ kind: "order", id: "09502PC" },
				{
					kind: "document",
					id: "document-1",
					mimeType: "application/pdf",
				},
			],
		});
	});

	test("rejects invoice generation status for a quote", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "documents_get_sales_pdf_status",
				version: 1,
				input: { orderNo: "Q-1", type: "quote", mode: "invoice" },
			},
			{ getSalesOrderCandidates: async () => [{ ...order, type: "quote" }] },
		);
		expect(result.status).toBe("requires_input");
		expect(result.warnings).toEqual(["Quotes support quote PDFs only."]);
	});
});
