import { describe, expect, it, spyOn } from "bun:test";
import {
	decodeSalesOrderListKeysetCursor,
	encodeSalesOrderListKeysetCursor,
	getOrders,
	getOrdersCount,
	getOrdersSchema,
	getOrdersSummary,
	normalizeOrderRow,
	resolveSpecialOrderLinkState,
} from "./sales-orders-v2";

const READ_MODEL_ENV_KEYS = [
	"GND_SALES_ORDERS_READ_MODEL_MODE",
	"GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE",
	"GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE",
] as const;

async function withReadModelEnv(
	values: Partial<Record<(typeof READ_MODEL_ENV_KEYS)[number], string>>,
	operation: () => Promise<void>,
) {
	const previous = Object.fromEntries(
		READ_MODEL_ENV_KEYS.map((key) => [key, process.env[key]]),
	);
	for (const key of READ_MODEL_ENV_KEYS) {
		const value = values[key];
		if (value === undefined) process.env[key] = undefined;
		else process.env[key] = value;
	}
	try {
		await operation();
	} finally {
		for (const key of READ_MODEL_ENV_KEYS) {
			const value = previous[key];
			if (value === undefined) process.env[key] = undefined;
			else process.env[key] = value;
		}
	}
}

function emptyOrderReadDb() {
	return {
		salesOrders: {
			count: async () => 0,
			findMany: async () => [],
		},
		salesInventoryProjectionState: { findMany: async () => [] },
		lineItem: { findMany: async () => [] },
		specialOrderApprovalRequest: { findMany: async () => [] },
	};
}

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		orderId: "12345AB",
		slug: "12345ab",
		type: "order",
		status: "Draft",
		prodStatus: null,
		priority: null,
		createdAt: new Date("2026-06-25T00:00:00.000Z"),
		updatedAt: new Date("2026-06-25T00:00:00.000Z"),
		meta: {},
		productionGate: null,
		grandTotal: 1000,
		amountDue: 1000,
		subTotal: 1000,
		extraCosts: [],
		taxes: [],
		stat: [],
		deliveries: [],
		customer: null,
		billingAddress: null,
		shippingAddress: null,
		salesRep: null,
		isDyke: false,
		paymentTerm: null,
		paymentDueDate: null,
		deliveryOption: null,
		shippingAddressId: null,
		inventoryStatus: null,
		dealerAuthId: null,
		_count: { notes: 0 },
		...overrides,
	} as unknown as Parameters<typeof normalizeOrderRow>[0];
}

describe("sales orders default query contract", () => {
	it("projects administrative completion without mutating operational lifecycle state", () => {
		const row = normalizeOrderRow(
			makeOrder({
				completionRecords: [
					{
						id: "completion-1",
						requestId: "00000000-0000-4000-8000-000000000001",
						cancellationRequestId: null,
						salesOrderId: 1,
						milestone: "FULFILLMENT_COMPLETED",
						completionMethod: "STATUS_ONLY",
						state: "ACTIVE",
						effectiveAt: null,
						recordedAt: new Date("2026-08-01T12:00:00.000Z"),
						recordedBy: { id: 7, name: "Admin" },
						cancelledAt: null,
						cancelledBy: null,
						cancellationReason: null,
						updatedAt: new Date("2026-08-01T12:00:00.000Z"),
					},
				],
			}),
		);
		expect(row.productionState).toBe("unknown");
		expect(row.fulfillmentState).toBe("N/A");
		expect(row.productionLabel).toContain("implied by Fulfillment");
		expect(row.fulfillmentLabel).toBe("Administratively completed");
		expect(row.completion.fulfillmentEffectiveAt).toBeNull();
	});
	it("keeps cohort-excluded read requests on legacy and emits one safe event", async () => {
		await withReadModelEnv(
			{
				GND_SALES_ORDERS_READ_MODEL_MODE: "read",
				GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE: "0",
				GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE: "1",
			},
			async () => {
				const events: unknown[][] = [];
				const consoleInfo = spyOn(console, "info").mockImplementation(
					(...args) => {
						events.push(args);
					},
				);
				try {
					const result = await getOrders(
						{
							userId: 42,
							requestId: "cohort-excluded",
							db: emptyOrderReadDb(),
						} as unknown as Parameters<typeof getOrders>[0],
						{ q: "private search", size: 20 },
					);

					expect(result.data).toEqual([]);
					const performanceEvents = events.filter(
						(event) => event[0] === "[sales-orders-performance]",
					);
					expect(performanceEvents).toHaveLength(1);
					expect(performanceEvents[0]?.[1]).toMatchObject({
						selectedPath: "legacy",
						fallbackReason: "cohort_excluded",
						status: "ok",
						searchKind: "broad",
					});
					expect(JSON.stringify(performanceEvents)).not.toContain(
						"private search",
					);
				} finally {
					consoleInfo.mockRestore();
				}
			},
		);
	});

	it("emits exactly one error event when the legacy query fails", async () => {
		await withReadModelEnv(
			{
				GND_SALES_ORDERS_READ_MODEL_MODE: "off",
				GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE: "1",
			},
			async () => {
				const events: unknown[][] = [];
				const consoleInfo = spyOn(console, "info").mockImplementation(
					(...args) => {
						events.push(args);
					},
				);
				try {
					const db = emptyOrderReadDb();
					db.salesOrders.count = async () => {
						throw new Error("database unavailable");
					};

					await expect(
						getOrders(
							{
								userId: 42,
								requestId: "legacy-error",
								db,
							} as unknown as Parameters<typeof getOrders>[0],
							{ size: 20 },
						),
					).rejects.toThrow("database unavailable");

					const performanceEvents = events.filter(
						(event) => event[0] === "[sales-orders-performance]",
					);
					expect(performanceEvents).toHaveLength(1);
					expect(performanceEvents[0]?.[1]).toMatchObject({
						selectedPath: "legacy",
						status: "error",
					});
				} finally {
					consoleInfo.mockRestore();
				}
			},
		);
	});

	it("falls back once after a projection read error and records the reason", async () => {
		await withReadModelEnv(
			{
				GND_SALES_ORDERS_READ_MODEL_MODE: "read",
				GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE: "100",
				GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE: "1",
			},
			async () => {
				let findManyCalls = 0;
				const events: unknown[][] = [];
				const consoleInfo = spyOn(console, "info").mockImplementation(
					(...args) => {
						events.push(args);
					},
				);
				const consoleError = spyOn(console, "error").mockImplementation(
					() => {},
				);
				try {
					const db = {
						...emptyOrderReadDb(),
						salesOrders: {
							count: async () => 1,
							findMany: async () => {
								findManyCalls += 1;
								return findManyCalls === 1
									? [
											{
												id: 99,
												createdAt: new Date("2026-08-30T00:00:00.000Z"),
												updatedAt: new Date("2026-08-30T00:00:00.000Z"),
											},
										]
									: [];
							},
						},
						salesOrderListProjection: {
							findMany: async () => {
								throw new Error("projection unavailable");
							},
						},
					};
					const result = await getOrders(
						{
							userId: 42,
							requestId: "projection-error",
							db,
						} as unknown as Parameters<typeof getOrders>[0],
						{ size: 20 },
					);

					expect(result.data).toEqual([]);
					expect(findManyCalls).toBe(2);
					const performanceEvents = events.filter(
						(event) => event[0] === "[sales-orders-performance]",
					);
					expect(performanceEvents).toHaveLength(1);
					expect(performanceEvents[0]?.[1]).toMatchObject({
						selectedPath: "legacy",
						fallbackReason: "read_error",
						status: "ok",
					});
				} finally {
					consoleInfo.mockRestore();
					consoleError.mockRestore();
				}
			},
		);
	});

	it("records one projection-independent summary event", async () => {
		await withReadModelEnv(
			{
				GND_SALES_ORDERS_READ_MODEL_MODE: "read",
				GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE: "100",
				GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE: "1",
			},
			async () => {
				let countCalls = 0;
				const events: unknown[][] = [];
				const consoleInfo = spyOn(console, "info").mockImplementation(
					(...args) => {
						events.push(args);
					},
				);
				try {
					const result = await getOrdersSummary(
						{
							userId: 42,
							requestId: "summary",
							db: {
								salesOrders: {
									count: async () => {
										countCalls += 1;
										return countCalls === 1 ? 2 : 1;
									},
									aggregate: async (input: {
										_sum: Record<string, boolean>;
									}) => ({
										_sum: input._sum.grandTotal
											? { grandTotal: 500 }
											: { amountDue: 125 },
									}),
								},
							},
						} as unknown as Parameters<typeof getOrdersSummary>[0],
						{},
					);

					expect(result).toEqual({
						totalOrders: 2,
						invoiceValue: 500,
						outstandingBalance: 125,
						paidOrders: 1,
						evaluatingOrders: 1,
					});
					const performanceEvents = events.filter(
						(event) => event[0] === "[sales-orders-performance]",
					);
					expect(performanceEvents).toHaveLength(1);
					expect(performanceEvents[0]?.[1]).toMatchObject({
						configuredMode: "off",
						effectiveMode: "off",
						cohortIncluded: false,
						selectedPath: "summary",
						status: "ok",
						stageDurationsMs: {
							summary_total_orders: expect.any(Number),
							summary_invoice_value: expect.any(Number),
							summary_outstanding_balance: expect.any(Number),
							summary_paid_orders: expect.any(Number),
							summary_evaluating_orders: expect.any(Number),
						},
					});
				} finally {
					consoleInfo.mockRestore();
				}
			},
		);
	});

	it("uses the actor-derived handoff relation without an implicit current-rep filter", async () => {
		const countQueries: unknown[] = [];
		const ctx = {
			userId: 7,
			db: {
				users: {
					findFirst: async () => ({
						id: 7,
						roles: [{ organizationId: 4, role: { name: "Super Admin" } }],
					}),
				},
				salesOrders: {
					count: async (input: unknown) => {
						countQueries.push(input);
						return 0;
					},
				},
			},
		} as unknown as Parameters<typeof getOrdersCount>[0];

		await getOrdersCount(ctx, { needsAction: "open" });
		await getOrdersCount(ctx, {
			needsAction: "open",
			"sales.rep": "Pablo Cruz",
		});

		expect(countQueries[0]).toMatchObject({
			where: {
				AND: [
					expect.anything(),
					{
						handoffActionEpochs: {
							some: { organizationId: { in: [4] } },
						},
					},
				],
			},
		});
		expect(JSON.stringify(countQueries[0])).not.toContain("salesRepId");
		expect(countQueries[1]).toMatchObject({
			where: {
				AND: [
					{
						AND: expect.arrayContaining([{ salesRep: { name: "Pablo Cruz" } }]),
					},
					expect.anything(),
				],
			},
		});
	});

	it("round-trips the guarded keyset cursor", () => {
		const cursor = {
			version: 1 as const,
			offset: 40,
			createdAt: "2026-08-21T08:00:00.000Z",
			id: 901,
		};

		expect(
			decodeSalesOrderListKeysetCursor(
				encodeSalesOrderListKeysetCursor(cursor),
			),
		).toEqual(cursor);
		expect(decodeSalesOrderListKeysetCursor("orders-k1.invalid")).toBeNull();
	});

	it("derives active and expired current Special Order links", () => {
		const now = new Date("2026-08-14T12:00:00.000Z").getTime();
		expect(
			resolveSpecialOrderLinkState(
				{ status: "ACTIVE", expiresAt: new Date(now + 60_000) },
				now,
			),
		).toBe("ACTIVE");
		expect(
			resolveSpecialOrderLinkState(
				{ status: "ACTIVE", expiresAt: new Date(now - 1) },
				now,
			),
		).toBe("EXPIRED");
		expect(
			resolveSpecialOrderLinkState(
				{ status: "CONSUMED", expiresAt: new Date(now + 60_000) },
				now,
			),
		).toBeNull();
	});

	it("accepts the promoted v2 filter aliases on the default schema", () => {
		expect(
			getOrdersSchema.parse({
				q: "08499",
				customerName: "Acme",
				invoiceStatus: "outstanding",
				priority: "HIGH",
				orderNo: "08499PC",
				bin: true,
				paymentReview: "needs_review",
				salesChannel: "dealership",
				inbound: "in_progress",
				specialOrderScope: "special_orders",
				specialOrder: "expired",
				"completion.production": "completed",
				"completion.fulfillment": "pending",
				sort: ["grandTotal.desc"],
			}),
		).toEqual({
			q: "08499",
			customerName: "Acme",
			invoiceStatus: "outstanding",
			priority: "HIGH",
			orderNo: "08499PC",
			bin: true,
			paymentReview: "needs_review",
			salesChannel: "dealership",
			inbound: "in_progress",
			specialOrderScope: "special_orders",
			specialOrder: "expired",
			"completion.production": "completed",
			"completion.fulfillment": "pending",
			sort: ["grandTotal.desc"],
		});
	});

	it("calculates fallback ccc for credit-card invoice display", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
				},
			}),
		);

		expect(row.baseInvoiceTotal).toBe(1000);
		expect(row.displayCcc).toBe(35);
		expect(row.invoiceTotal).toBe(1035);
		expect(row.amountDue).toBe(1000);
		expect(row.amountPaid).toBe(0);
		expect(row.displayAmountDue).toBe(1035);
	});

	it("repairs stale stored ccc when present", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
					ccc: 12.34,
				},
			}),
		);

		expect(row.displayCcc).toBe(35);
		expect(row.invoiceTotal).toBe(1035);
	});

	it("uses matching stored ccc when present", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
					ccc: 35,
				},
			}),
		);

		expect(row.displayCcc).toBe(35);
		expect(row.invoiceTotal).toBe(1035);
	});

	it("keeps non-card invoice display base-only", () => {
		const row = normalizeOrderRow(
			makeOrder({
				meta: {
					payment_option: "Check",
					ccc_percentage: 3.5,
					ccc: 35,
				},
			}),
		);

		expect(row.displayCcc).toBe(0);
		expect(row.invoiceTotal).toBe(1000);
	});

	it("exposes flat paid and display paid amounts for mobile adapters", () => {
		const row = normalizeOrderRow(
			makeOrder({
				grandTotal: 1000,
				amountDue: 250,
				meta: {
					payment_option: "Credit Card",
					ccc_percentage: 3.5,
				},
			}),
		);

		expect(row.amountPaid).toBe(750);
		expect(row.amountDue).toBe(250);
		expect(row.displayAmountPaid).toBe(750);
		expect(row.displayAmountDue).toBe(258.75);
	});

	it("exposes the latest clean payment review state", () => {
		const row = normalizeOrderRow(
			makeOrder({
				payments: [
					{
						id: 1,
						amount: 150,
						status: "success",
						origin: "office",
						reviewStatus: "needs_review",
						deletedAt: null,
						createdAt: new Date("2026-07-01T10:00:00.000Z"),
					},
					{
						id: 2,
						amount: 200,
						status: "success",
						origin: "online",
						reviewStatus: "needs_review",
						deletedAt: null,
						createdAt: new Date("2026-07-02T10:00:00.000Z"),
					},
					{
						id: 3,
						amount: 300,
						status: "success",
						origin: "online",
						reviewStatus: "reviewed",
						deletedAt: null,
						createdAt: new Date("2026-07-03T10:00:00.000Z"),
					},
				],
			}),
		);

		expect(row.latestPaymentReview).toEqual({
			paymentId: 2,
			amount: 200,
			origin: "online",
			receivedAt: new Date("2026-07-02T10:00:00.000Z"),
			reviewStatus: "needs_review",
		});
	});

	it("counts the payment review queue using distinct latest-payment groups", async () => {
		const groupByCalls: Array<{ by: string[]; where: unknown }> = [];
		const ctx = {
			userId: 7,
			db: {
				salesPayments: {
					groupBy: async (args: { by: string[]; where: unknown }) => {
						groupByCalls.push(args);
						return [{ orderId: 1 }, { orderId: 2 }];
					},
				},
				salesOrders: {
					count: async () => {
						throw new Error("salesOrders.count should not run");
					},
				},
			},
		} as unknown as Parameters<typeof getOrdersCount>[0];

		const count = await getOrdersCount(ctx, {
			showing: "all sales",
			paymentReview: "needs_review",
		});

		expect(count).toBe(2);
		expect(groupByCalls[0]).toMatchObject({
			by: ["orderId"],
			where: {
				deletedAt: null,
				reviewStatus: "needs_review",
				status: {
					in: ["success", "completed", "paid"],
				},
			},
		});
	});
});
