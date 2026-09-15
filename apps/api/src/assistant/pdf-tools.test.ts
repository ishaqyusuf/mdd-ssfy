import { describe, expect, test } from "bun:test";
import { createAssistantResultEnvelopeSchema } from "./contracts";
import {
	assistantToolRegistry,
	executeApprovedAssistantProposal,
	executeRegisteredAssistantTool,
	AssistantProposalPrecommitError,
} from "./registry";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { viewOrders: true, viewOrderPayment: true },
};

test("approved PDF preflight preserves unexpected causes without queueing a job", async () => {
	const original = new Error("private database password");
	let queueCalls = 0;
	try {
		await executeApprovedAssistantProposal(actor, {
			toolId: "documents_generate_pdf", version: 1,
			payload: { orderNo: "QA-123", mode: "invoice", expectedRevision: "revision-1", forceRegenerate: false },
		}, {
			getSalesOrderCandidates: async () => { throw original; },
			queueSalesPdfJob: async () => { queueCalls++; throw new Error("must not queue"); },
		});
		throw new Error("Expected preflight failure");
	} catch (error) {
		expect(error).toBeInstanceOf(AssistantProposalPrecommitError);
		expect(error).toMatchObject({ code: "failed", cause: original });
	}
	expect(queueCalls).toBe(0);
});

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

	test("allows non-financial PDF status without payment access", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { viewOrders: true, viewOrderPayment: false },
			},
			{
				toolId: "documents_get_sales_pdf_status",
				version: 1,
				input: { orderNo: "09502PC", mode: "production" },
			},
			{
				getSalesOrderCandidates: async () => [order],
				getSalesPdfStatus: async () => ({
					mode: "production",
					documentType: "production_pdf",
					status: "on_demand",
					snapshotId: null,
					documentId: null,
					generatedAt: null,
					sourceUpdatedAt: null,
					expiresAt: null,
					revision: "pdf-revision-1",
				}),
			},
		);
		expect(result).toMatchObject({ status: "success" });
	});

	test("requires payment access for price-bearing PDF status", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { viewOrders: true, viewOrderPayment: false },
			},
			{
				toolId: "documents_get_sales_pdf_status",
				version: 1,
				input: { orderNo: "09502PC", mode: "invoice" },
			},
		);
		expect(result).toMatchObject({ status: "unavailable" });
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

	test("keeps generation behind T17 while preserving the durable handler", async () => {
		await expect(
			executeRegisteredAssistantTool(actor, {
				toolId: "documents_generate_pdf",
				version: 1,
				input: {
					orderNo: "09502PC",
					mode: "invoice",
					expectedRevision: "order-revision-1",
				},
			}),
		).rejects.toThrow("not available");
		const definition = assistantToolRegistry.find(
			(tool) => tool.toolId === "documents_generate_pdf",
		);
		if (!definition?.handler) throw new Error("PDF generation handler missing");
		const rawResult = await definition.handler(
			actor,
			{
				orderNo: "09502PC",
				mode: "invoice",
				expectedRevision: "order-revision-1",
				forceRegenerate: false,
			},
			{
				getSalesOrderCandidates: async () => [order],
				queueSalesPdfJob: async () => ({
					jobId: "snapshot-1",
					triggerRunId: "trigger-1",
					status: "queued",
					reused: false,
				}),
				getSalesPdfStatus: async () => ({
					mode: "invoice",
					documentType: "invoice_pdf",
					status: "queued",
					snapshotId: "snapshot-1",
					documentId: null,
					generatedAt: null,
					sourceUpdatedAt: "2026-09-02T00:00:00.000Z",
					expiresAt: null,
					revision: "pdf-revision-1",
				}),
			} as never,
		);
		const result = createAssistantResultEnvelopeSchema(
			definition.outputSchema,
		).parse(rawResult);
		expect(result).toMatchObject({
			status: "pending",
			artifact: { id: "snapshot-1", status: "queued" },
			job: { id: "snapshot-1", status: "queued" },
		});
	});

	test("does not queue a PDF when the approved Sales revision changed", async () => {
		let queueCalls = 0;
		await expect(
			executeApprovedAssistantProposal(
				actor,
				{
					toolId: "documents_generate_pdf",
					version: 1,
					payload: {
						orderNo: "09502PC",
						mode: "invoice",
						expectedRevision: "attacker-revision",
						forceRegenerate: false,
					},
					expectedTargetRevision: "order-revision-1",
				},
				{
					getSalesOrderCandidates: async () => [
						{ ...order, revision: "order-revision-2" },
					],
					queueSalesPdfJob: async () => {
						queueCalls += 1;
						throw new Error("must not queue");
					},
				},
			),
		).rejects.toThrow("unavailable");
		expect(queueCalls).toBe(0);
	});

	test("reports a source-stale generation as terminal without cancellation", async () => {
		const definition = assistantToolRegistry.find(
			(tool) => tool.toolId === "documents_generate_pdf",
		);
		if (!definition?.handler) throw new Error("PDF generation handler missing");
		const result = await definition.handler(
			actor,
			{
				orderNo: "09502PC",
				mode: "invoice",
				expectedRevision: "order-revision-1",
				forceRegenerate: false,
			},
			{
				getSalesOrderCandidates: async () => [order],
				queueSalesPdfJob: async () => ({
					jobId: "snapshot-stale",
					triggerRunId: "trigger-stale",
					status: "stale",
					reused: false,
				}),
				getSalesPdfStatus: async () => ({
					mode: "invoice",
					documentType: "invoice_pdf",
					status: "stale",
					snapshotId: "snapshot-stale",
					documentId: null,
					generatedAt: null,
					sourceUpdatedAt: "2026-09-02T00:00:00.000Z",
					expiresAt: null,
					revision: "pdf-revision-stale",
				}),
			} as never,
		);
		expect(result).toMatchObject({
			status: "conflict",
			artifact: { id: "snapshot-stale", status: "failed" },
			job: { id: "snapshot-stale", status: "failed" },
			allowedNextActions: [],
		});
	});

	test("keeps cancellation actor-scoped and revision-bound", async () => {
		const definition = assistantToolRegistry.find(
			(tool) => tool.toolId === "documents_cancel_pdf",
		);
		if (!definition?.handler)
			throw new Error("PDF cancellation handler missing");
		const result = await definition.handler(
			actor,
			{
				orderNo: "09502PC",
				mode: "invoice",
				snapshotId: "cm1234567890123456789012",
				expectedRevision: "order-revision-1",
			},
			{
				getSalesOrderCandidates: async () => [order],
				cancelSalesPdfJob: async () => true,
			} as never,
		);
		expect(result).toMatchObject({
			status: "success",
			artifact: { status: "cancelled" },
			job: { status: "cancelled" },
		});
	});

	test("does not report cancelled lifecycle refs after a cancellation race", async () => {
		const definition = assistantToolRegistry.find(
			(tool) => tool.toolId === "documents_cancel_pdf",
		);
		if (!definition?.handler)
			throw new Error("PDF cancellation handler missing");
		const result = await definition.handler(
			actor,
			{
				orderNo: "09502PC",
				mode: "invoice",
				snapshotId: "cm1234567890123456789012",
				expectedRevision: "order-revision-1",
			},
			{
				getSalesOrderCandidates: async () => [order],
				cancelSalesPdfJob: async () => false,
			} as never,
		);
		expect(result.status).toBe("conflict");
		expect(result.artifact).toBeUndefined();
		expect(result.job).toBeUndefined();
	});
});
