import { describe, expect, test } from "bun:test";
import {
	type AssistantToolActor,
	type AssistantToolServices,
	discoverAssistantTools,
	executeApprovedAssistantProposal,
	executeRegisteredAssistantTool,
} from "./registry";

const actor: AssistantToolActor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	grants: { viewOrders: true, viewSalesCustomers: true },
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
};

const detailedOrder = {
	...order,
	pipeline: {
		version: "sales-pipeline/v2",
		revision: "pipeline-revision-1",
		freshness: {
			state: "current" as const,
			observedAt: "2026-09-02T00:00:00.000Z",
		},
		headline: { code: "in_production", label: "In production", tone: "blue" },
		payment: { state: "partially_paid", total: "1234.56", amountDue: "34.56" },
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
		blockers: [
			{
				code: "payment_due",
				dimension: "payment",
				label: "Payment remains due.",
			},
			{
				code: "production_pending",
				dimension: "production",
				label: "Production is in progress.",
			},
		],
		conflicts: [],
	},
	deliveries: [
		{
			id: 11,
			status: "pending",
			mode: "delivery",
			dueAt: "2026-09-10T00:00:00.000Z",
			deliveredAt: null,
			updatedAt: "2026-09-02T00:00:00.000Z",
		},
	],
	payments: [{ amount: "1200", status: "success", reviewStatus: "approved" }],
	statistics: [
		{
			type: "production",
			status: "in progress",
			total: "3.5",
			percentage: "29",
		},
	],
};

function services(
	overrides: Partial<AssistantToolServices>,
): Partial<AssistantToolServices> {
	return overrides;
}

describe("assistant Sales and customer tools", () => {
	test("discovers the seven implemented reads only when their grants are present", () => {
		const ids = discoverAssistantTools(actor).map((tool) => tool.toolId);
		expect(ids).toContain("sales_find_orders");
		expect(ids).toContain("sales_get_order_status");
		expect(ids).toContain("sales_explain_blockers");
		expect(ids).toContain("sales_get_timeline");
		expect(ids).toContain("customers_find");
		expect(ids).toContain("customers_get_summary");
		expect(ids).toContain("customers_get_order_history");
		expect(
			discoverAssistantTools({ ...actor, grants: {} }).map(
				(tool) => tool.toolId,
			),
		).toEqual([
			"system_explain_capability",
			"system_request_capability",
			"system_search_tools",
		]);
		const customerOnly = discoverAssistantTools({
			...actor,
			grants: { viewSalesCustomers: true },
		}).map((tool) => tool.toolId);
		expect(customerOnly).toContain("customers_find");
		expect(customerOnly).not.toContain("customers_get_summary");
		expect(customerOnly).not.toContain("customers_get_order_history");
		const customerEditor = discoverAssistantTools({
			...actor,
			grants: { editSalesCustomers: true },
		}).map((tool) => tool.toolId);
		expect(customerEditor).toContain("customers_find");
		const orderViewer = discoverAssistantTools({
			...actor,
			grants: { viewOrders: true },
		}).map((tool) => tool.toolId);
		expect(orderViewer).toContain("customers_find");
		expect(orderViewer).toContain("customers_get_summary");
		expect(orderViewer).toContain("customers_get_order_history");
	});

	test("returns bounded order search results with entity and next-action hints", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_find_orders",
				version: 1,
				input: { query: "Ada", limit: 10 },
			},
			services({
				findSalesOrders: async () => ({ items: [order], nextCursor: null }),
			}),
		);

		expect(result).toMatchObject({
			status: "success",
			data: { items: [{ orderNo: "09502PC" }], nextCursor: null },
			entities: [{ kind: "order", id: "09502PC" }],
			allowedNextActions: [
				{ toolId: "sales_get_order_status", toolVersion: 1 },
			],
		});
	});

	test("prepares and applies a reviewed P.O. number update", async () => {
		const editor = {
			...actor,
			grants: { ...actor.grants, editOrders: true },
		};
		let purchaseOrderNumber = "OLD-PO";
		let currentOrder = detailedOrder;
		const updateServices = services({
			getSalesOrderCandidates: async () => [currentOrder],
			getSalesPurchaseOrder: async () => purchaseOrderNumber,
			updateSalesPurchaseOrder: async (_actor, input) => {
				expect(input).toEqual({
					salesOrderId: 101,
					expectedUpdatedAt: "2026-09-02T00:00:00.000Z",
					purchaseOrderNumber: "NEW-PO",
				});
				purchaseOrderNumber = input.purchaseOrderNumber;
				currentOrder = {
					...detailedOrder,
					updatedAt: "2026-09-03T00:00:00.000Z",
					revision: "order-revision-2",
				};
				return true;
			},
		});
		const prepared = await executeRegisteredAssistantTool(
			editor,
			{
				toolId: "sales_prepare_purchase_order_update",
				version: 1,
				input: {
					orderNo: "09502PC",
					type: "order",
					purchaseOrderNumber: "new-po",
				},
			},
			updateServices,
		);
		expect(prepared).toMatchObject({
			status: "success",
			data: {
				currentPurchaseOrderNumber: "OLD-PO",
				nextPurchaseOrderNumber: "NEW-PO",
			},
		});

		const applied = await executeApprovedAssistantProposal(
			editor,
			{
				toolId: "sales_update_purchase_order",
				version: 1,
				expectedTargetRevision: "order-revision-1",
				payload: {
					orderNo: "09502PC",
					type: "order",
					expectedRevision: "order-revision-1",
					previousPurchaseOrderNumber: "OLD-PO",
					purchaseOrderNumber: "NEW-PO",
				},
			},
			updateServices,
		);
		expect(applied).toMatchObject({
			status: "success",
			data: {
				order: { revision: "order-revision-2" },
				currentPurchaseOrderNumber: "NEW-PO",
				nextPurchaseOrderNumber: "NEW-PO",
			},
			invalidationTags: ["sales.orders"],
		});
	});

	test("prepares and records one reviewed manual payment", async () => {
		const paymentEditor = {
			...actor,
			grants: { ...actor.grants, editOrderPayment: true },
		};
		let currentOrder = detailedOrder;
		const customer = {
			id: 9,
			accountNo: "ada-millwork",
			name: "Ada Millwork",
			profile: "Builder",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-09-01T00:00:00.000Z",
			revision: "customer-revision-1",
			orderCount: 1,
			latestOrder: order,
		};
		const paymentServices = services({
			getSalesOrderCandidates: async () => [currentOrder],
			getCustomerSummary: async () => customer,
			recordSalesManualPayment: async (_actor, input) => {
				expect(input).toEqual({
					salesOrderId: 101,
					orderNo: "09502PC",
					accountNo: "ada-millwork",
					amount: 25,
					paymentMethod: "cash",
					checkNo: undefined,
				});
				currentOrder = {
					...detailedOrder,
					amountDue: "9.56",
					updatedAt: "2026-09-03T00:00:00.000Z",
					revision: "order-revision-2",
				};
				return {
					terminalPaymentSession: null,
					status: "success" as const,
					appliedSalesIds: [101],
					appliedSales: [
						{
							salesId: 101,
							orderId: "09502PC",
							amountApplied: 25,
							remainingDue: 9.56,
						},
					],
					walletAppliedAmount: 0,
					walletCreditAmount: 0,
					customerChargeAmount: 25,
					customerReceiptQueueStatus: "not_requested" as const,
				};
			},
		});
		const prepared = await executeRegisteredAssistantTool(
			paymentEditor,
			{
				toolId: "finance_prepare_manual_payment",
				version: 1,
				input: {
					orderNo: "09502PC",
					amount: 25,
					paymentMethod: "cash",
				},
			},
			paymentServices,
		);
		expect(prepared).toMatchObject({
			status: "success",
			data: {
				order: { orderNo: "09502PC" },
				customer: { accountNo: "ada-millwork" },
				payment: {
					amount: 25,
					currency: "USD",
					paymentMethod: "cash",
					notifyCustomer: false,
				},
				expectedAmountDue: "34.56",
				state: "prepared",
			},
		});

		const recorded = await executeApprovedAssistantProposal(
			paymentEditor,
			{
				toolId: "finance_record_manual_payment",
				version: 1,
				expectedTargetRevision: "order-revision-1",
				payload: {
					orderNo: "09502PC",
					accountNo: "ada-millwork",
					amount: 25,
					paymentMethod: "cash",
					expectedAmountDue: "34.56",
					expectedRevision: "order-revision-1",
				},
			},
			paymentServices,
		);
		expect(recorded).toMatchObject({
			status: "success",
			data: {
				order: { revision: "order-revision-2", amountDue: "9.56" },
				state: "recorded",
				receipt: {
					appliedSalesIds: [101],
					appliedAmount: 25,
					remainingDue: 9.56,
					customerReceiptQueueStatus: "not_requested",
				},
			},
			invalidationTags: ["sales.orders", "sales.payments", "sales.pipeline"],
		});
	});

	test("does not prepare a manual payment above the current amount due", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { ...actor.grants, editOrderPayment: true },
			},
			{
				toolId: "finance_prepare_manual_payment",
				version: 1,
				input: {
					orderNo: "09502PC",
					amount: 40,
					paymentMethod: "cash",
				},
			},
			services({
				getSalesOrderCandidates: async () => [detailedOrder],
				getCustomerSummary: async () => ({
					id: 9,
					accountNo: "ada-millwork",
					name: "Ada Millwork",
					profile: "Builder",
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-09-01T00:00:00.000Z",
					revision: "customer-revision-1",
					orderCount: 1,
					latestOrder: order,
				}),
			}),
		);
		expect(result.status).toBe("conflict");
		expect(result.warnings).toContain(
			"The payment exceeds the current amount due. Review a smaller amount.",
		);
	});

	test("creates a trusted checkout link for one scoped outstanding order", async () => {
		const customer = {
			id: 9,
			accountNo: "ada-millwork",
			name: "Ada Millwork",
			profile: "Builder",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-09-01T00:00:00.000Z",
			revision: "customer-revision-1",
			orderCount: 1,
			latestOrder: order,
		};
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { ...actor.grants, editOrderPayment: true },
			},
			{
				toolId: "finance_create_payment_link",
				version: 1,
				input: { orderNo: "09502PC" },
			},
			services({
				getSalesOrderCandidates: async () => [detailedOrder],
				getCustomerSummary: async () => customer,
				createSalesPaymentLink: async (_actor, input) => {
					expect(input).toEqual({
						salesOrderId: 101,
						customerId: 9,
						amountDue: 34.56,
					});
					return "https://gndprodesk.localhost/checkout/token/v2";
				},
			}),
		);
		expect(result).toMatchObject({
			status: "success",
			data: {
				order: { orderNo: "09502PC" },
				customer: { accountNo: "ada-millwork" },
				amountDue: "34.56",
				currency: "USD",
				paymentUrl: "https://gndprodesk.localhost/checkout/token/v2",
			},
			sources: [
				{ kind: "record", label: "Order 09502PC" },
				{
					kind: "document",
					label: "Pay order 09502PC",
					href: "https://gndprodesk.localhost/checkout/token/v2",
				},
			],
		});
	});

	test("returns a bounded canonical refund overview without provider identifiers", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { ...actor.grants, viewOrderPayment: true },
			},
			{
				toolId: "finance_get_refund_overview",
				version: 1,
				input: { orderNo: "09502PC" },
			},
			services({
				getSalesOrderCandidates: async () => [detailedOrder],
				getSalesRefundOverview: async () => ({
					order: {
						id: 101,
						orderNo: "09502PC",
						grandTotalCents: 123456,
						amountDueCents: 3456,
					},
					summary: {
						receivedCents: 120000,
						completedRefundCents: 2500,
						pendingRefundCents: 0,
						netCents: 117500,
					},
					transactions: [
						{
							id: "payment:501",
							salesPaymentId: 501,
							transactionId: 701,
							kind: "payment" as const,
							createdAt: new Date("2026-09-02T00:00:00.000Z"),
							description: "Square payment",
							paymentMethod: "card",
							checkNo: null,
							status: "COMPLETED",
							authorName: "Sales Rep",
							receivedCents: 120000,
							completedRefundCents: 2500,
							pendingRefundCents: 0,
							netCents: 117500,
							remainingRefundableCents: 117500,
							refundable: true,
							tender: {
								id: "internal-tender-id",
								providerPaymentId: "provider-payment-id",
								amountCents: 120000,
								tipCents: 0,
								currency: "USD",
								paidAt: new Date("2026-09-02T00:00:00.000Z"),
								eligibleOrders: [
									{
										id: 101,
										orderNo: "09502PC",
										amountDueCents: 3456,
										grandTotalCents: 123456,
									},
								],
							},
							refunds: [
								{
									id: "refund-id",
									providerRefundId: "provider-refund-id",
									providerStatus: "completed",
									applicationStatus: "applied",
									origin: "gnd",
									amountCents: 2500,
									principalCents: 2500,
									cccCents: 0,
									tipCents: 0,
									reason: "Customer request",
									note: null,
									createdAt: new Date("2026-09-03T00:00:00.000Z"),
									completedAt: new Date("2026-09-03T00:01:00.000Z"),
									failureDetail: null,
								},
							],
						},
					],
				}),
			}),
		);

		expect(result).toMatchObject({
			status: "success",
			data: {
				order: { orderNo: "09502PC" },
				summary: {
					receivedCents: 120000,
					completedRefundCents: 2500,
					netCents: 117500,
				},
				transactions: [
					{
						transactionRef: "payment:501",
						remainingRefundableCents: 117500,
						refundable: true,
						refunds: [
							{
								status: "completed",
								amountCents: 2500,
								reason: "Customer request",
							},
						],
					},
				],
			},
		});
		expect(JSON.stringify(result)).not.toContain("internal-tender-id");
		expect(JSON.stringify(result)).not.toContain("provider-payment-id");
		expect(JSON.stringify(result)).not.toContain("provider-refund-id");
	});

	test("prepares and creates one reviewed principal-only Square refund", async () => {
		const refundEditor = {
			...actor,
			grants: { ...actor.grants, editRefundSquare: true },
		};
		const refundOverview = {
			order: {
				id: 101,
				orderNo: "09502PC",
				grandTotalCents: 123456,
				amountDueCents: 3456,
			},
			summary: {
				receivedCents: 120000,
				completedRefundCents: 0,
				pendingRefundCents: 0,
				netCents: 120000,
			},
			transactions: [
				{
					id: "payment:501",
					salesPaymentId: 501,
					transactionId: 701,
					kind: "payment" as const,
					createdAt: new Date("2026-09-02T00:00:00.000Z"),
					description: "Square payment",
					paymentMethod: "card",
					checkNo: null,
					status: "COMPLETED",
					authorName: "Sales Rep",
					receivedCents: 120000,
					completedRefundCents: 0,
					pendingRefundCents: 0,
					netCents: 120000,
					remainingRefundableCents: 120000,
					refundable: true,
					tender: {
						id: "internal-tender-id",
						providerPaymentId: "provider-payment-id",
						amountCents: 120000,
						tipCents: 0,
						currency: "USD",
						paidAt: new Date("2026-09-02T00:00:00.000Z"),
						eligibleOrders: [
							{
								id: 101,
								orderNo: "09502PC",
								amountDueCents: 3456,
								grandTotalCents: 123456,
							},
						],
					},
					refunds: [],
				},
			],
		};
		const refundServices = services({
			getSalesOrderCandidates: async () => [detailedOrder],
			getSalesRefundOverview: async () => refundOverview,
			createSalesRefund: async (_actor, input) => {
				expect(input).toEqual({
					tenderPaymentId: "internal-tender-id",
					salesOrderId: 101,
					originalSalesPaymentId: 501,
					amountCents: 100,
					reason: "Customer request",
				});
				return {
					refundId: "refund-request-1",
					status: "not_submitted",
					queued: true,
				};
			},
		});

		const prepared = await executeRegisteredAssistantTool(
			refundEditor,
			{
				toolId: "finance_prepare_square_refund",
				version: 1,
				input: {
					orderNo: "09502PC",
					amount: 1,
					reason: "Customer request",
				},
			},
			refundServices,
		);
		expect(prepared).toMatchObject({
			status: "success",
			data: {
				order: { orderNo: "09502PC" },
				transactionRef: "payment:501",
				refund: {
					amountCents: 100,
					remainingRefundableCents: 120000,
					remainingAfterRefundCents: 119900,
				},
				state: "prepared",
			},
		});

		const requested = await executeApprovedAssistantProposal(
			refundEditor,
			{
				toolId: "finance_create_square_refund",
				version: 1,
				payload: {
					orderNo: "09502PC",
					transactionRef: "payment:501",
					amount: 1,
					reason: "Customer request",
					expectedRemainingRefundableCents: 120000,
					expectedRevision: "order-revision-1",
				},
			},
			refundServices,
		);
		expect(requested).toMatchObject({
			status: "success",
			data: {
				state: "requested",
				receipt: {
					refundRef: "refund-request-1",
					status: "not_submitted",
					queued: true,
				},
			},
			invalidationTags: ["sales.orders", "sales.payments", "sales.pipeline"],
		});
	});

	test("rejects an approved P.O. update when the reviewed value is stale", async () => {
		const editor = {
			...actor,
			grants: { ...actor.grants, editOrders: true },
		};
		await expect(
			executeApprovedAssistantProposal(
				editor,
				{
					toolId: "sales_update_purchase_order",
					version: 1,
					expectedTargetRevision: "order-revision-1",
					payload: {
						orderNo: "09502PC",
						type: "order",
						expectedRevision: "order-revision-1",
						previousPurchaseOrderNumber: "OLD-PO",
						purchaseOrderNumber: "NEW-PO",
					},
				},
				services({
					getSalesOrderCandidates: async () => [detailedOrder],
					getSalesPurchaseOrder: async () => "CHANGED-PO",
				}),
			),
		).rejects.toMatchObject({ code: "conflict" });
	});

	test("does not suggest order-backed customer actions without order access", async () => {
		const customerOnlyActor = {
			...actor,
			grants: { viewSalesCustomers: true },
		};
		const result = await executeRegisteredAssistantTool(
			customerOnlyActor,
			{
				toolId: "customers_find",
				version: 1,
				input: { query: "Ada", limit: 10 },
			},
			services({
				findCustomers: async () => ({
					items: [
						{
							id: 9,
							accountNo: "cust-9",
							name: "Ada Millwork",
							profile: "Builder",
							createdAt: "2026-01-01T00:00:00.000Z",
							updatedAt: "2026-09-01T00:00:00.000Z",
							revision: "customer-revision-1",
						},
					],
					nextCursor: null,
				}),
			}),
		);

		expect(result.allowedNextActions).toEqual([]);
	});

	test("asks for an order or quote choice instead of guessing duplicate numbers", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_get_order_status",
				version: 1,
				input: { orderNo: "09502PC" },
			},
			services({
				getSalesOrderCandidates: async () => [
					detailedOrder,
					{ ...detailedOrder, id: 102, type: "quote", revision: "quote-1" },
				],
			}),
		);

		expect(result.status).toBe("requires_input");
		expect(result.data).toMatchObject({
			order: null,
			candidates: [{ type: "order" }, { type: "quote" }],
		});
		expect(result.entities).toHaveLength(2);
		expect(result.entities).toMatchObject([
			{ id: "09502PC", salesType: "order" },
			{ id: "09502PC", salesType: "quote" },
		]);
	});

	test("returns a conflict for a stale revision and hides finance without payment access", async () => {
		const getSalesOrderCandidates = async () => [detailedOrder];
		const stale = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_get_order_status",
				version: 1,
				input: { orderNo: "09502PC", expectedRevision: "old-revision" },
			},
			services({ getSalesOrderCandidates }),
		);
		expect(stale.status).toBe("conflict");
		expect(stale.revision).toBe("order-revision-1");

		const current = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_get_order_status",
				version: 1,
				input: { orderNo: "09502PC", expectedRevision: "order-revision-1" },
			},
			services({ getSalesOrderCandidates }),
		);
		expect(current.data).toMatchObject({
			order: {
				grandTotal: null,
				amountDue: null,
				invoiceStatus: null,
				payments: [],
				pipeline: {
					payment: { state: null, total: null, amountDue: null },
					blockers: [{ code: "production_pending" }],
				},
			},
		});
	});

	test("accepts a search summary revision when resolving current detailed status", async () => {
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "sales_get_order_status",
				version: 1,
				input: { orderNo: "09502PC", expectedRevision: "summary-revision-1" },
			},
			services({
				getSalesOrderCandidates: async () => [
					{ ...detailedOrder, summaryRevision: "summary-revision-1" },
				],
			}),
		);

		expect(result.status).toBe("success");
		expect(result.revision).toBe("order-revision-1");
	});

	test("returns finance details only with the existing payment grant", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { ...actor.grants, viewOrderPayment: true },
			},
			{
				toolId: "sales_explain_blockers",
				version: 1,
				input: { orderNo: "09502PC" },
			},
			services({ getSalesOrderCandidates: async () => [detailedOrder] }),
		);
		expect(result.data).toMatchObject({
			order: { amountDue: "34.56", payments: [{ amount: "1200" }] },
		});
		expect(JSON.stringify(result.data)).toContain("payment_due");
	});

	test("summarizes canonical receivables with explicit currency", async () => {
		const result = await executeRegisteredAssistantTool(
			{
				...actor,
				grants: { ...actor.grants, editOrderPayment: true },
			},
			{
				toolId: "finance_summarize_orders",
				version: 1,
				input: { query: "Ada", agingBuckets: ["current"] },
			},
			services({
				getSalesFinanceSummary: async () => ({
					receivableCount: 2,
					customerCount: 1,
					totalOutstanding: 34.61,
					overdueAmount: 0,
					currentAmount: 34.61,
					unreconciledCount: 0,
					bucketAmounts: { current: 34.61 },
					bucketCounts: { current: 2 },
				}),
			}),
		);

		expect(result).toMatchObject({
			status: "success",
			data: {
				currency: "USD",
				receivableCount: 2,
				totalOutstanding: 34.61,
			},
			sources: [{ kind: "report", id: "sales-finance-receivables" }],
		});
	});

	test("returns safe customer summary and scoped order history", async () => {
		const customer = {
			id: 9,
			accountNo: "ada-millwork",
			name: "Ada Millwork",
			profile: "Builder",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-09-01T00:00:00.000Z",
			revision: "customer-revision-1",
			orderCount: 1,
			latestOrder: order,
		};
		const result = await executeRegisteredAssistantTool(
			actor,
			{
				toolId: "customers_get_order_history",
				version: 1,
				input: { customerId: 9, limit: 10 },
			},
			services({
				getCustomerOrderHistory: async () => ({
					customer,
					items: [order],
					nextCursor: null,
				}),
			}),
		);
		expect(result).toMatchObject({
			status: "success",
			data: { customer: { id: 9 }, items: [{ orderNo: "09502PC" }] },
			entities: [
				{ kind: "customer", id: "ada-millwork" },
				{ kind: "order", id: "09502PC" },
			],
		});
		expect(JSON.stringify(result)).not.toContain("email");
	});
});
