import { describe, expect, it, spyOn } from "bun:test";
import { type Db, db as fieldSource } from "@gnd/db";

import { getProductionQueueBoundaries } from "./production-date";
import { resolveSalesPipelineSnapshotFromOrder } from "./sales-pipeline-order";
import {
	getSalesProductionCalendar,
	getSalesProductionDashboard,
	getSalesProductionSummary,
	getSalesProductions,
	isProductionCompleted,
	sortProductionListByPriority,
} from "./sales-production";
import { salesProductionQueryParamsSchema } from "./schema";
import { whereSales } from "./utils/where-queries";

type SalesFindManyArgs = {
	take?: number;
	skip?: number;
	where?: { id?: { in?: number[] }; AND?: unknown[] };
	select?: Record<string, unknown>;
};

function productionRow(id: number, priority: string) {
	return {
		id,
		orderId: `ORDER-${id}`,
		status: null,
		prodStatus: null,
		createdAt: new Date(`2026-07-${String(id).padStart(2, "0")}T12:00:00Z`),
		priority,
		grandTotal: 1250,
		amountDue: 250,
		customer: null,
		billingAddress: null,
		salesRep: null,
		stat: [],
		deliveries: [],
		itemControls: [],
		assignments: [],
		completionRecords: [],
	};
}

function completedProductionRow(id: number, priority: string) {
	const row = {
		...productionRow(id, priority),
		itemControls: [
			{
				uid: `control-${id}`,
				produceable: true,
				shippable: false,
				qtyControls: [
					{
						type: "qty",
						total: 1,
						itemTotal: 1,
						qty: 1,
						updatedAt: new Date("2026-07-01T12:00:00Z"),
					},
				],
				assignments: [],
			},
		],
		completionRecords: [
			{
				id: `completion-${id}`,
				milestone: "PRODUCTION_COMPLETED",
				completionMethod: "STATUS_ONLY",
				recordedAt: new Date("2026-07-02T12:00:00Z"),
				effectiveAt: null,
				recordedById: 7,
				state: "ACTIVE",
				cancelledAt: null,
			},
		],
	};
	return row;
}

function assignedProductionRow(id: number, priority: string) {
	const dueDate = new Date("2026-09-02T09:00:00.000Z");
	return {
		...productionRow(id, priority),
		itemControls: [
			{
				uid: `control-${id}`,
				produceable: true,
				shippable: false,
				qtyControls: [
					{
						type: "qty",
						total: 1,
						itemTotal: 1,
						qty: 1,
						updatedAt: dueDate,
					},
				],
				assignments: [{ id: 92 }],
			},
		],
		assignments: [
			{
				id: 92,
				assignedToId: 17,
				qtyAssigned: 1,
				qtyCompleted: 0,
				lhQty: 0,
				rhQty: 0,
				dueDate,
				assignedAt: dueDate,
				startedAt: null,
				completedAt: null,
				updatedAt: dueDate,
				submissions: [],
			},
		],
	};
}

function completedProjection(row: ReturnType<typeof completedProductionRow>) {
	return {
		salesOrderId: row.id,
		pipelineRevision: resolveSalesPipelineSnapshotFromOrder(row as never)
			.revision,
		pipelineProductionApplicability: "required",
		pipelineProductionState: "administratively_completed",
	};
}

describe("sales production priority sorting", () => {
	it.each(["projection", "source"] as const)(
		"excludes cancelled production and scopes %s membership to undeleted orders",
		async (mode) => {
			const rows = [null, "cancelled", "canceled", "void", "voided"].map(
				(status, index) => ({
					...assignedProductionRow(index + 1, "NORMAL"),
					status,
				}),
			);
			let membershipWhere: unknown;
			const db = {
				orderItemProductionAssignments: {
					fields: fieldSource.orderItemProductionAssignments.fields,
					findMany: async () => [],
				},
				salesOrderListProjection: {
					findMany: async (args: {
						where: {
							salesOrder: { is: unknown };
							pipelineHeadline: unknown;
						};
					}) => {
						membershipWhere = args.where.salesOrder.is;
						expect(args.where.pipelineHeadline).toEqual({ not: null });
						if (mode === "source") return [];
						return rows.map((row) => {
							const snapshot = resolveSalesPipelineSnapshotFromOrder(
								row as never,
							);
							return {
								salesOrderId: row.id,
								pipelineProductionApplicability:
									snapshot.production.applicability,
								pipelineProductionState: snapshot.production.state,
								pipelineHeadline: snapshot.headline.code,
							};
						});
					},
				},
				salesOrders: {
					count: async () => 0,
					findMany: async (args: SalesFindManyArgs) => {
						if (args.where?.AND) {
							expect(args.where.AND[0]).toEqual(membershipWhere);
							expect(JSON.stringify(args.where)).toContain(
								'"pipelineHeadline":null',
							);
							return mode === "source" ? rows.map(({ id }) => ({ id })) : [];
						}
						return rows;
					},
				},
				salesProductionSubmissionMaterialReview: {
					count: async () => 0,
					findMany: async () => [],
				},
			};
			const { summary } = await getSalesProductionSummary(
				db as unknown as Db,
				{},
			);
			expect(summary.queueCount).toBe(1);
			expect(membershipWhere).toEqual({
				AND: [expect.anything(), { type: "order", deletedAt: null }],
			});
		},
	);

	it("shares one indexed canonical membership read across dashboard sections", async () => {
		let projectionReads = 0;
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => [],
			},
			salesOrderListProjection: {
				findMany: async () => {
					projectionReads += 1;
					return [];
				},
			},
			salesOrders: {
				count: async () => 0,
				findMany: async () => [],
			},
			salesProductionSubmissionMaterialReview: {
				count: async () => 0,
				findMany: async () => [],
			},
		};

		const dashboard = await getSalesProductionDashboard(
			db as unknown as Db,
			{},
		);

		expect(projectionReads).toBe(1);
		expect(dashboard.summary.queueCount).toBe(0);
		expect(dashboard.alerts).toEqual({
			pastDue: [],
			dueToday: [],
			dueTomorrow: [],
		});
	});

	it("loads only summary data for the worker dashboard", async () => {
		let orderReads = 0;
		let assignmentReads = 0;
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => {
					assignmentReads += 1;
					return [];
				},
			},
			salesOrderListProjection: { findMany: async () => [] },
			salesOrders: {
				count: async () => 0,
				findMany: async () => {
					orderReads += 1;
					return [];
				},
			},
			salesProductionSubmissionMaterialReview: {
				count: async () => 0,
				findMany: async () => [],
			},
		};
		const input = { workerId: 17 };
		const summary = await getSalesProductionSummary(db as unknown as Db, input);
		const summaryOrderReads = orderReads;
		const summaryAssignmentReads = assignmentReads;
		orderReads = 0;
		assignmentReads = 0;

		const dashboard = await getSalesProductionDashboard(
			db as unknown as Db,
			input,
		);

		expect(dashboard.summary).toEqual(summary.summary);
		expect(orderReads).toBe(summaryOrderReads);
		expect(assignmentReads).toBe(summaryAssignmentReads);
	});

	it.each([
		{ mode: "legacy", percent: "100", observe: false, canonical: false },
		{ mode: "shadow", percent: "0", observe: false, canonical: false },
		{ mode: "shadow", percent: "100", observe: true, canonical: false },
		{ mode: "canonical", percent: "0", observe: false, canonical: false },
		{ mode: "canonical", percent: "5", observe: false, canonical: false },
		{ mode: "canonical", percent: "100", observe: true, canonical: true },
		{
			mode: "canonical",
			percent: "5",
			observe: true,
			canonical: true,
			mixed: true,
		},
		{
			mode: "shadow",
			percent: "5",
			observe: true,
			canonical: false,
			mixed: true,
		},
	])(
		"loads only consumed list/schedule evidence: %j",
		async ({ mode, percent, mixed = false }) => {
			const keys = [
				"SALES_PIPELINE_READ_MODE",
				"SALES_PIPELINE_COHORT_PERCENT",
				"SALES_PIPELINE_SHADOW_SAMPLE_PERCENT",
			] as const;
			const previous = keys.map((key) => process.env[key]);
			process.env.SALES_PIPELINE_READ_MODE = mode;
			process.env.SALES_PIPELINE_COHORT_PERCENT = percent;
			process.env.SALES_PIPELINE_SHADOW_SAMPLE_PERCENT = percent;
			const info = spyOn(console, "info").mockImplementation(() => {});
			try {
				const rows = (mixed ? [11, 26701] : [26701]).map((id) => ({
					...productionRow(id, "NORMAL"),
					createdAt: new Date("2026-07-01T12:00:00Z"),
				}));
				let evidenceReads = 0;
				const evidenceIds = new Set<number>();
				const db = {
					$queryRaw: async () => (mixed ? [{ id: 11 }] : []),
					orderItemProductionAssignments: {
						fields: fieldSource.orderItemProductionAssignments.fields,
						findMany: async () =>
							rows.map((row) => ({
								orderId: row.id,
								qtyAssigned: 1,
								qtyCompleted: 0,
								completedAt: null,
								submissions: [],
							})),
					},
					salesOrderListProjection: { findMany: async () => [] },
					salesProductionSubmissionMaterialReview: { findMany: async () => [] },
					salesOrders: {
						count: async () => 1,
						findMany: async (args: SalesFindManyArgs) => {
							if (
								args.select &&
								Object.keys(args.select).length === 1 &&
								args.select.id
							)
								return args.skip === undefined
									? []
									: rows.map(({ id }) => ({ id }));
							if (args.where?.id?.in) {
								if (args.select?.updatedAt) {
									evidenceReads += 1;
									for (const id of args.where.id.in) evidenceIds.add(id);
								}
								return rows.filter((row) =>
									args.where?.id?.in?.includes(row.id),
								);
							}
							return rows;
						},
					},
				};
				const list = await getSalesProductions(db as unknown as Db, {
					size: 20,
					includeMaterials: false,
				});
				expect(list.data.map((item) => item.id)).toEqual(
					mixed ? [11, 26701] : [26701],
				);
				expect(list.data[0]?.pipeline).not.toBeNull();
				if (mixed) expect(list.data[1]?.pipeline).not.toBeNull();
				expect(evidenceReads > 0).toBe(true);
				if (mixed) expect([...evidenceIds]).toEqual([11, 26701]);
				evidenceReads = 0;
				evidenceIds.clear();
				await getSalesProductionSummary(db as unknown as Db, {});
				expect(evidenceReads).toBe(0);
				expect([...evidenceIds]).toEqual([]);
				expect(
					info.mock.calls.some(
						([event]) => event === "[sales-pipeline-shadow]",
					),
				).toBe(false);
			} finally {
				info.mockRestore();
				keys.forEach((key, index) => {
					if (previous[index] === undefined)
						Reflect.deleteProperty(process.env, key);
					else process.env[key] = previous[index];
				});
			}
		},
	);

	it("sorts assignment ownership timestamps with unassigned rows last", () => {
		const rows = [
			{ id: 1, assignedAt: new Date("2026-08-01T12:00:00.000Z") },
			{ id: 2, assignedAt: null },
			{ id: 3, assignedAt: new Date("2026-09-01T12:00:00.000Z") },
		];

		expect(
			sortProductionListByPriority(rows, "assignedAtDesc").map((row) => row.id),
		).toEqual([3, 1, 2]);
		expect(
			sortProductionListByPriority(rows, "assignedAtAsc").map((row) => row.id),
		).toEqual([1, 3, 2]);
	});

	it("keeps completed assignments on the production calendar", async () => {
		let capturedWhere: unknown;
		const completedAt = new Date("2026-09-01T12:00:00.000Z");
		const dueDate = new Date("2026-09-01T09:00:00.000Z");
		const sourceOrder = assignedProductionRow(42, "NORMAL");
		sourceOrder.assignments[0] = {
			...sourceOrder.assignments[0]!,
			id: 91,
			qtyCompleted: 1,
			completedAt,
			dueDate,
		};
		sourceOrder.itemControls[0]!.assignments = [{ id: 91 }];
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async (args: { where?: unknown }) => {
					capturedWhere = args.where;
					return [
						{
							id: 91,
							assignedToId: 17,
							startedAt: dueDate,
							completedAt,
							dueDate,
							qtyAssigned: 1,
							qtyCompleted: 1,
							lhQty: 0,
							rhQty: 0,
							submissions: [],
							assignedTo: { name: "Worker" },
							order: {
								id: 42,
								orderId: "ORDER-42",
								status: null,
								prodStatus: null,
								stat: [],
								priority: "NORMAL",
								customer: { name: "Acme", businessName: null },
							},
						},
					];
				},
			},
			salesOrders: {
				findMany: async () => [sourceOrder],
			},
		};

		const result = await getSalesProductionCalendar(
			db as unknown as Db,
			{
				from: "2026-09-01",
				to: "2026-09-07",
				scope: "completed",
			},
			{ canReschedule: true },
		);

		expect(JSON.stringify(capturedWhere)).not.toContain(
			'"type":"prodCompleted"',
		);
		expect(
			(capturedWhere as { order: { AND: unknown[] } }).order.AND[0],
		).toEqual({ deletedAt: null });
		expect(result.scheduled).toHaveLength(1);
		expect(result.scheduled[0]).toMatchObject({
			orderNo: "ORDER-42",
			status: "completed",
			assignmentIds: [91],
			assignmentCount: 1,
			sourceDate: "2026-09-01",
			canReschedule: false,
			rescheduleLockReason: "PRODUCTION_GROUP_COMPLETED",
		});
		expect(result.scheduled[0]).toHaveProperty("expectedEvidenceRevision");
	});

	it("does not let a legacy terminal order string complete open schedule evidence", async () => {
		const dueDate = new Date("2026-09-02T09:00:00.000Z");
		const sourceOrder = assignedProductionRow(43, "NORMAL");
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => [
					{
						id: 92,
						assignedToId: 17,
						startedAt: null,
						completedAt: null,
						dueDate,
						qtyAssigned: 1,
						qtyCompleted: 0,
						lhQty: 0,
						rhQty: 0,
						submissions: [],
						assignedTo: { name: "Worker" },
						order: {
							id: 43,
							orderId: "ORDER-43",
							status: "Fulfilled",
							prodStatus: null,
							stat: [],
							priority: "NORMAL",
							customer: { name: "Acme", businessName: null },
						},
					},
				],
			},
			salesOrders: { findMany: async () => [sourceOrder] },
		};

		const result = await getSalesProductionCalendar(db as unknown as Db, {
			from: "2026-09-01",
			to: "2026-09-07",
		});

		expect(result.scheduled[0]).toMatchObject({
			orderNo: "ORDER-43",
			status: "assigned",
		});
	});

	it("colors a canonically completed order as completed despite an open assignment", async () => {
		const dueDate = new Date("2026-09-02T09:00:00.000Z");
		const order = {
			...completedProductionRow(44, "NORMAL"),
			assignments: [
				{
					id: 93,
					assignedToId: 17,
					qtyAssigned: 1,
					qtyCompleted: 0,
					lhQty: 0,
					rhQty: 0,
					dueDate,
					assignedAt: dueDate,
					completedAt: null,
					updatedAt: dueDate,
					submissions: [],
				},
			],
		};
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => [
					{
						id: 93,
						assignedToId: 17,
						startedAt: null,
						completedAt: null,
						dueDate,
						qtyAssigned: 1,
						qtyCompleted: 0,
						lhQty: 0,
						rhQty: 0,
						submissions: [],
						assignedTo: { name: "Worker" },
						order: {
							id: order.id,
							orderId: order.orderId,
							status: order.status,
							prodStatus: order.prodStatus,
							stat: order.stat,
							priority: order.priority,
							customer: { name: "Acme", businessName: null },
						},
					},
				],
			},
			salesOrders: { findMany: async () => [order] },
		};

		const result = await getSalesProductionCalendar(db as unknown as Db, {
			from: "2026-09-01",
			to: "2026-09-07",
			scope: "all",
		});

		expect(result.scheduled[0]).toMatchObject({
			orderNo: "ORDER-44",
			status: "completed",
		});
	});

	it("ignores an explicit legacy Production completion string", async () => {
		const previousReadMode = process.env.SALES_PIPELINE_READ_MODE;
		const previousCohort = process.env.SALES_PIPELINE_COHORT_PERCENT;
		process.env.SALES_PIPELINE_READ_MODE = "canonical";
		process.env.SALES_PIPELINE_COHORT_PERCENT = "0";
		try {
			const dueDate = new Date("2026-09-02T09:00:00.000Z");
			const sourceOrder = {
				...assignedProductionRow(45, "NORMAL"),
				prodStatus: "Completed",
			};
			const db = {
				orderItemProductionAssignments: {
					fields: fieldSource.orderItemProductionAssignments.fields,
					findMany: async () => [
						{
							id: 94,
							assignedToId: 17,
							startedAt: null,
							completedAt: null,
							dueDate,
							qtyAssigned: 1,
							qtyCompleted: 0,
							lhQty: 0,
							rhQty: 0,
							submissions: [],
							assignedTo: { name: "Worker" },
							order: {
								id: 45,
								orderId: "ORDER-45",
								status: null,
								prodStatus: "Completed",
								stat: [],
								priority: "NORMAL",
								customer: { name: "Acme", businessName: null },
							},
						},
					],
				},
				salesOrders: { findMany: async () => [sourceOrder] },
			};

			const result = await getSalesProductionCalendar(db as unknown as Db, {
				from: "2026-09-01",
				to: "2026-09-07",
				scope: "all",
			});

			expect(result.scheduled[0]).toMatchObject({
				orderNo: "ORDER-45",
				status: "assigned",
			});
		} finally {
			if (previousReadMode === undefined) {
				Reflect.deleteProperty(process.env, "SALES_PIPELINE_READ_MODE");
			} else {
				process.env.SALES_PIPELINE_READ_MODE = previousReadMode;
			}
			if (previousCohort === undefined) {
				Reflect.deleteProperty(process.env, "SALES_PIPELINE_COHORT_PERCENT");
			} else {
				process.env.SALES_PIPELINE_COHORT_PERCENT = previousCohort;
			}
		}
	});

	it.each(
		[
			{ reviewStatus: "PENDING", administrative: false, expected: "assigned" },
			{ reviewStatus: "REJECTED", administrative: false, expected: "assigned" },
			{
				reviewStatus: "CANCELLED",
				administrative: false,
				expected: "assigned",
			},
			{
				reviewStatus: "APPROVED",
				administrative: false,
				expected: "completed",
			},
			{ reviewStatus: "PENDING", administrative: true, expected: "completed" },
		].flatMap((scenario) =>
			["0", "5", "100"].map((cohort) => ({ ...scenario, cohort })),
		),
	)(
		"keeps Calendar aggregate fallback aligned with review evidence: %j",
		async ({ cohort, reviewStatus, administrative, expected }) => {
			const previousReadMode = process.env.SALES_PIPELINE_READ_MODE;
			const previousCohort = process.env.SALES_PIPELINE_COHORT_PERCENT;
			process.env.SALES_PIPELINE_READ_MODE = "canonical";
			process.env.SALES_PIPELINE_COHORT_PERCENT = cohort;
			try {
				const dueDate = new Date("2026-09-02T09:00:00.000Z");
				const assignment = {
					id: 13284,
					assignedToId: 44,
					startedAt: null,
					completedAt: null,
					dueDate,
					assignedAt: dueDate,
					updatedAt: dueDate,
					qtyAssigned: 1,
					qtyCompleted: 0,
					lhQty: 0,
					rhQty: 0,
					submissions: [
						{
							id: 1,
							qty: 1,
							lhQty: 0,
							rhQty: 0,
							createdAt: dueDate,
							updatedAt: dueDate,
							materialReview: { status: reviewStatus, updatedAt: dueDate },
						},
					],
				};
				const completedOrder = completedProductionRow(26701, "NORMAL");
				const order = {
					...completedOrder,
					orderId: "09502PC",
					createdAt: dueDate,
					completionRecords: administrative
						? completedOrder.completionRecords
						: [],
					stat: [
						{ type: "prodCompleted", score: 1, total: 1, percentage: 100 },
					],
					assignments: [assignment],
					customer: { name: "Customer", businessName: null },
				};
				const db = {
					orderItemProductionAssignments: {
						fields: fieldSource.orderItemProductionAssignments.fields,
						findMany: async () => [
							{ ...assignment, assignedTo: { name: "Worker" }, order },
						],
					},
					salesProductionSubmissionMaterialReview: { findMany: async () => reviewStatus === "PENDING" ? [{salesOrderId: 26701, classificationReason: "ALLOCATION_REVIEW"}] : [] },
					salesOrders: { findMany: async () => [order] },
				};
				const result = await getSalesProductionCalendar(db as unknown as Db, {
					from: "2026-09-01",
					to: "2026-09-07",
					scope: "all",
				});
				expect(result.scheduled[0]).toMatchObject({
					orderNo: "09502PC",
					status: expected,
				});
    if (reviewStatus === "PENDING") {
     expect(result.scheduled[0]?.orderPresentation.primary.label).toBe("Production completed");
     expect(result.scheduled[0]?.orderPresentation.attention.map(reason => reason.code)).toContain("allocation_review");
    }

			} finally {
				if (previousReadMode === undefined) {
					Reflect.deleteProperty(process.env, "SALES_PIPELINE_READ_MODE");
				} else process.env.SALES_PIPELINE_READ_MODE = previousReadMode;
				if (previousCohort === undefined) {
					Reflect.deleteProperty(process.env, "SALES_PIPELINE_COHORT_PERCENT");
				} else process.env.SALES_PIPELINE_COHORT_PERCENT = previousCohort;
			}
		},
	);

	it("loads the global candidate set before applying a production sort", async () => {
		const findManyCalls: SalesFindManyArgs[] = [];
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => [],
			},
			salesOrders: {
				count: async () => 1000,
				findMany: async (args: SalesFindManyArgs) => {
					findManyCalls.push(args);
					return [];
				},
			},
		};

		await getSalesProductions(db as unknown as Db, {
			production: "pending",
			productionSort: "priority",
			size: 20,
			cursor: "40",
		});

		const candidateRead = findManyCalls.find((call) => call.take === undefined);
		expect(candidateRead).toBeDefined();
		expect(candidateRead?.skip).toBeUndefined();
	});

	it("reads only the requested database-sorted page plus look-ahead without losing the next page", async () => {
		const previousMode = process.env.SALES_PIPELINE_READ_MODE;
		process.env.SALES_PIPELINE_READ_MODE = "legacy";
		try {
			const rows = Array.from({ length: 41 }, (_, index) => ({
				...productionRow(index + 1, "NORMAL"),
				createdAt: new Date("2026-07-01T12:00:00Z"),
			}));
			const calls: SalesFindManyArgs[] = [];
			const db = {
				salesOrders: {
					findMany: async (args: SalesFindManyArgs) => {
						calls.push(args);
						const selected = args.where?.id?.in
							? rows
									.filter((row) => args.where?.id?.in?.includes(row.id))
									.reverse()
							: rows.slice(
									args.skip || 0,
									(args.skip || 0) + (args.take || rows.length),
								);
						return selected.map((row) =>
							Object.fromEntries(
								Object.entries(row).filter(([key]) => args.select?.[key]),
							),
						);
					},
				},
			};
			const first = await getSalesProductions(db as unknown as Db, {
				size: 20,
			});
			const second = await getSalesProductions(db as unknown as Db, {
				size: 20,
				cursor: first.meta.cursor,
			});
			const pageQueries = calls.filter(
				({ take, select }) =>
					take !== undefined && take !== 250 && Boolean(select?.id),
			);
			expect(pageQueries.map(({ skip, take }) => ({ skip, take }))).toEqual([
				{ skip: 0, take: 21 },
				{ skip: 20, take: 21 },
			]);
			expect(pageQueries.map(({ select }) => select)).toEqual([
				{ id: true },
				{ id: true },
			]);
			expect(
				calls
					.filter(({ take }) => take === undefined)
					.some(({ where }) => where?.id?.in?.length === 21),
			).toBe(true);
			expect(first.data.map((row) => row.id)).toEqual(
				Array.from({ length: 20 }, (_, i) => i + 1),
			);
			expect(second.data.map((row) => row.id)).toEqual(
				Array.from({ length: 20 }, (_, i) => i + 21),
			);
			expect(second.meta.cursor).toBe("40");
		} finally {
			if (previousMode === undefined)
				Reflect.deleteProperty(process.env, "SALES_PIPELINE_READ_MODE");
			else process.env.SALES_PIPELINE_READ_MODE = previousMode;
		}
	});

	it("bounds material-enriched production pages", async () => {
		const findManyCalls: SalesFindManyArgs[] = [];
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => [],
			},
			salesOrders: {
				count: async () => 1000,
				findMany: async (args: SalesFindManyArgs) => {
					findManyCalls.push(args);
					return [];
				},
			},
		};

		await getSalesProductions(db as unknown as Db, {
			production: "pending",
			size: 999,
		});

		expect(findManyCalls.some((call) => call.take === 100)).toBe(true);
		expect(
			salesProductionQueryParamsSchema.safeParse({ size: 101 }).success,
		).toBe(false);
	});

	it("keeps the next cursor on the first unconsumed sorted candidate", async () => {
		let call = 0;
		const db = {
			salesOrders: {
				findMany: async () => {
					call += 1;
					if (call === 1) {
						return [
							productionRow(2, "NORMAL"),
							productionRow(3, "LOW"),
							productionRow(1, "CRITICAL"),
						];
					}
					return [
						productionRow(1, "CRITICAL"),
						productionRow(2, "NORMAL"),
						productionRow(3, "LOW"),
					];
				},
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			productionSort: "priority",
			size: 1,
		});

		expect(result.data.map((row) => row.id)).toEqual([1]);
		expect(result.meta.cursor).toBe("1");
	});

	it("keeps later material-filtered pages reachable without a global rescan", async () => {
		let call = 0;
		const rows = [
			productionRow(1, "CRITICAL"),
			productionRow(2, "NORMAL"),
			productionRow(3, "LOW"),
		];
		const db = {
			salesOrders: {
				findMany: async () => {
					call += 1;
					return call === 1 ? rows : rows;
				},
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			material: "unavailable",
			size: 1,
		});

		expect(result.data.map((row) => row.id)).toEqual([1]);
		expect(result.meta.count).toBeUndefined();
		expect(result.meta.cursor).toBe("1");
	});

	it("applies search and canonical schedule membership before due sorting", async () => {
		const findManyCalls: Array<SalesFindManyArgs & { where?: unknown }> = [];
		let assignmentOrderScope: unknown;
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async ({ where }: { where: { order?: unknown } }) => {
					assignmentOrderScope = where.order;
					return [];
				},
			},
			salesOrders: {
				count: async () => 100,
				findMany: async (args: SalesFindManyArgs & { where?: unknown }) => {
					findManyCalls.push(args);
					return [];
				},
			},
		};

		await getSalesProductions(db as unknown as Db, {
			due: "today",
			q: "needle",
			size: 20,
			cursor: "40",
		});

		expect(findManyCalls[0]?.skip).toBeUndefined();
		expect(JSON.stringify(assignmentOrderScope)).toContain("needle");
		const serializedWhere = JSON.stringify(
			findManyCalls.find((call) => call.take !== 250)?.where,
		);
		expect(serializedWhere).toContain("needle");
		expect(serializedWhere).toContain('"id":{"in":[]');
		expect(serializedWhere).toContain('"completedAt":null');
		expect(serializedWhere).not.toContain('"completionRecords"');
	});

	it("keeps assignment filters when completion eligibility adds an outer predicate", async () => {
		const capturedSelect: unknown[] = [];
		const db = {
			salesOrders: {
				findMany: async (args: SalesFindManyArgs) => {
					if (args.select?.assignments) capturedSelect.push(args.select);
					return [productionRow(1, "NORMAL")];
				},
			},
		};

		await getSalesProductions(db as unknown as Db, {
			assignedToId: 17,
			production: "pending",
			"completion.production": "pending",
			includeMaterials: false,
			size: 20,
		});

		expect(JSON.stringify(capturedSelect)).toContain('"assignedToId":17');
	});

	it("shares open schedule evidence and resolves Completed canonically", async () => {
		let countCalls = 0;
		let lifecycleReadCalls = 0;
		const assignmentScopes: Array<{ completedAt?: Date | null }> = [];
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async ({
					where,
				}: {
					where: { completedAt?: Date | null };
				}) => {
					assignmentScopes.push(where);
					return [];
				},
			},
			salesOrders: {
				count: async () => {
					countCalls += 1;
					return 0;
				},
				findMany: async ({ select }: { select: Record<string, unknown> }) => {
					if (Object.keys(select).length > 1) lifecycleReadCalls += 1;
					return [];
				},
			},
			salesProductionSubmissionMaterialReview: {
				findMany: async () => [],
			},
			salesOrderListProjection: {
				findMany: async () => [],
			},
		};

		await getSalesProductionSummary(db as unknown as Db, {});

		expect(countCalls).toBe(1);
		expect(lifecycleReadCalls).toBe(0);
		expect(assignmentScopes).toHaveLength(1);
		for (const scope of assignmentScopes) {
			expect(scope.completedAt).toBeNull();
		}
	});

	it("loads open schedule evidence once and classifies every summary bucket exactly", async () => {
		const previousMode = process.env.SALES_PIPELINE_READ_MODE;
		process.env.SALES_PIPELINE_READ_MODE = "legacy";
		const boundaries = getProductionQueueBoundaries();
		let assignmentReads = 0;
		const openAssignment = (
			orderId: number,
			dueDate: Date | null,
			qtyCompleted = 0,
		) => ({
			orderId,
			dueDate,
			qtyAssigned: 1,
			lhQty: 0,
			rhQty: 0,
			qtyCompleted,
			completedAt: null,
			submissions: [],
		});
		const sourceRows = [
			...Array.from({ length: 5 }, (_, index) =>
				assignedProductionRow(index + 1, "NORMAL"),
			),
			completedProductionRow(6, "NORMAL"),
		];
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => {
					assignmentReads += 1;
					return [
						openAssignment(1, boundaries.today.gte),
						openAssignment(1, boundaries.today.gte),
						openAssignment(2, boundaries.tomorrow.gte),
						openAssignment(
							3,
							new Date(boundaries.today.gte.getTime() - 86_400_000),
						),
						openAssignment(
							4,
							new Date(boundaries.tomorrow.gte.getTime() + 86_400_000),
						),
						openAssignment(5, null),
						openAssignment(6, boundaries.today.gte, 1),
					];
				},
			},
			salesOrders: {
				count: async () => 0,
				findMany: async (args: SalesFindManyArgs) => {
					if (
						args.select &&
						Object.keys(args.select).length === 1 &&
						args.select.id
					) {
						return sourceRows.map(({ id }) => ({ id }));
					}
					return args.where?.id?.in
						? sourceRows.filter((row) => args.where?.id?.in?.includes(row.id))
						: sourceRows;
				},
			},
			salesProductionSubmissionMaterialReview: { findMany: async () => [] },
			salesOrderListProjection: { findMany: async () => [] },
		};

		try {
			const result = await getSalesProductionSummary(db as unknown as Db, {});

			expect(assignmentReads).toBe(1);
			expect(result.summary).toMatchObject({
				dueTodayCount: 1,
				dueTomorrowCount: 1,
				pastDueCount: 1,
				futureCount: 2,
				unscheduledCount: 1,
			});
		} finally {
			if (previousMode === undefined) {
				Reflect.deleteProperty(process.env, "SALES_PIPELINE_READ_MODE");
			} else {
				process.env.SALES_PIPELINE_READ_MODE = previousMode;
			}
		}
	});

	it("excludes soft-deleted sales from every Production summary membership read", async () => {
		const previousMode = process.env.SALES_PIPELINE_READ_MODE;
		process.env.SALES_PIPELINE_READ_MODE = "legacy";
		const countScopes: Array<{ AND?: unknown[] }> = [];
		let scheduleOrderScope: { AND?: unknown[] } | undefined;
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async ({ where }: { where: { order?: unknown } }) => {
					scheduleOrderScope = where.order as { AND?: unknown[] };
					return [];
				},
			},
			salesOrders: {
				count: async ({ where }: { where: { AND?: unknown[] } }) => {
					countScopes.push(where);
					return 0;
				},
				findMany: async () => [],
			},
			salesProductionSubmissionMaterialReview: { findMany: async () => [] },
			salesOrderListProjection: { findMany: async () => [] },
		};

		try {
			await getSalesProductionSummary(db as unknown as Db, {});

			expect(countScopes).toHaveLength(1);
			for (const scope of countScopes) {
				expect(JSON.stringify(scope)).toContain('"deletedAt":null');
			}
			expect(JSON.stringify(scheduleOrderScope)).toContain('"deletedAt":null');
		} finally {
			if (previousMode === undefined) {
				Reflect.deleteProperty(process.env, "SALES_PIPELINE_READ_MODE");
			} else {
				process.env.SALES_PIPELINE_READ_MODE = previousMode;
			}
		}
	});

	it.each([null, 44])(
		"preserves Paid and workspace filters in every summary count for worker %s",
		async (workerId) => {
			const countScopes: unknown[] = [];
			const assignmentScopes: Array<{
				order?: unknown;
				assignedToId?: number;
			}> = [];
			const db = {
				orderItemProductionAssignments: {
					fields: fieldSource.orderItemProductionAssignments.fields,
					findMany: async ({
						where,
					}: {
						where: { order?: unknown; assignedToId?: number };
					}) => {
						assignmentScopes.push(where);
						return [];
					},
				},
				salesProductionSubmissionMaterialReview: { findMany: async () => [] },
				salesOrderListProjection: { findMany: async () => [] },
				salesOrders: {
					count: async ({ where }: { where: unknown }) => {
						countScopes.push(where);
						return 0;
					},
					findMany: async ({ where }: { where: unknown }) => {
						countScopes.push(where);
						return [];
					},
				},
			};

			await getSalesProductionSummary(db as unknown as Db, {
				workerId,
				invoice: "paid",
				"customer.name": "Filter Customer",
				phone: "555-0100",
				po: "PO-FILTER",
				"sales.rep": "Filter Rep",
			});

			expect(countScopes).toHaveLength(workerId ? 3 : 2);
			expect(assignmentScopes).toHaveLength(1);
			for (const scope of assignmentScopes) {
				expect(scope.order).toBeDefined();
				expect(scope.assignedToId).toBe(workerId ?? undefined);
			}
			for (const scope of [
				...countScopes,
				...assignmentScopes.map((scope) => scope.order),
			]) {
				const serialized = JSON.stringify(scope);
				expect(serialized).toContain('"amountDue":0');
				expect(serialized).toContain('"contains":"Filter Customer"');
				expect(serialized).toContain('"phoneNo":"555-0100"');
				expect(serialized).toContain('"string_contains":"PO-FILTER"');
				expect(serialized).toContain('"salesRep":{"name":"Filter Rep"}');
			}
		},
	);

	it("serves indexed Completed membership without reloading full source evidence", async () => {
		const rows = Array.from({ length: 250 }, (_, index) => ({
			...completedProductionRow(index + 1, "NORMAL"),
			createdAt: new Date("2026-07-01T12:00:00Z"),
		}));
		const db = {
			orderItemProductionAssignments: {
				fields: fieldSource.orderItemProductionAssignments.fields,
				findMany: async () => [],
			},
			salesProductionSubmissionMaterialReview: { findMany: async () => [] },
			salesOrders: {
				count: async () => 0,
				findMany: async ({ select }: { select?: Record<string, unknown> }) =>
					select && Object.keys(select).length === 1 && select.id ? [] : rows,
			},
			salesOrderListProjection: {
				findMany: async (args: { cursor?: unknown }) => {
					if (args.cursor) return [];
					return rows.map((row) => ({
						...completedProjection(row),
						...(row.id === 1 ? { pipelineRevision: "stale" } : {}),
					}));
				},
			},
		};

		expect(
			(await getSalesProductionSummary(db as unknown as Db, {})).summary
				.completedCount,
		).toBe(250);
	});

	it.each(["fresh", "stale", "missing"] as const)(
		"preserves indexed Completed counts across pages with %s source evidence",
		async (evidence) => {
			const rows = Array.from({ length: 251 }, (_, index) => ({
				...completedProductionRow(index + 1, "NORMAL"),
				createdAt: new Date("2026-07-01T12:00:00Z"),
			}));
			const db = {
				orderItemProductionAssignments: {
					fields: fieldSource.orderItemProductionAssignments.fields,
					findMany: async () => [],
				},
				salesProductionSubmissionMaterialReview: { findMany: async () => [] },
				salesOrders: {
					count: async (args: {
						where: { AND?: Array<{ id?: { in: number[] } }> };
					}) => args.where.AND?.find((part) => part.id)?.id?.in.length ?? 0,
					findMany: async (args: { where: { id: { in: number[] } } }) =>
						rows.filter(
							(row) =>
								args.where.id?.in.includes(row.id) &&
								!(evidence === "missing" && row.id === 251),
						),
				},
				salesOrderListProjection: {
					findMany: async (args: {
						take: number;
						cursor?: { salesOrderId: number };
					}) =>
						rows
							.filter((row) => row.id > (args.cursor?.salesOrderId ?? 0))
							.slice(0, args.take)
							.map((row) => ({
								...completedProjection(row),
								...(evidence === "stale" && row.id === 251
									? { pipelineRevision: "stale" }
									: {}),
							})),
				},
			};

			expect(
				(await getSalesProductionSummary(db as unknown as Db, {})).summary
					.completedCount,
			).toBe(251);
		},
	);

	it.each([false, true])(
		"resolves uncached Completed candidates from fresh evidence (missing source: %s)",
		async (missingSource) => {
			const rows = [
				completedProductionRow(11, "NORMAL"),
				completedProductionRow(22, "NORMAL"),
				productionRow(41, "NORMAL"),
				{ ...completedProductionRow(52, "NORMAL"), completionRecords: [] },
			].map((row) => ({ ...row, createdAt: new Date("2026-07-01T12:00:00Z") }));
			const firstRow = rows.at(0);
			if (!firstRow) throw new Error("Expected a completed fixture row");
			let fallbackWhere: unknown;
			const db = {
				orderItemProductionAssignments: {
					fields: fieldSource.orderItemProductionAssignments.fields,
					findMany: async () => [],
				},
				salesProductionSubmissionMaterialReview: { findMany: async () => [] },
				salesOrderListProjection: {
					findMany: async () => [
						completedProjection(
							firstRow as ReturnType<typeof completedProductionRow>,
						),
					],
				},
				salesOrders: {
					count: async ({
						where,
					}: {
						where: { AND?: Array<{ id?: { in?: number[] } }> };
					}) => where.AND?.find((part) => part.id?.in)?.id?.in?.length ?? 0,
					findMany: async ({
						where,
						select,
					}: {
						where: { id?: { in?: number[] } };
						select: Record<string, unknown>;
					}) => {
						if (Object.keys(select).length === 1 && select.id) {
							fallbackWhere = where;
							return [{ id: 22 }, { id: 41 }, { id: 52 }];
						}
						return rows.filter(
							(row) =>
								where.id?.in?.includes(row.id) &&
								!(missingSource && row.id === 22),
						);
					},
				},
			};
			const result = getSalesProductionSummary(db as unknown as Db, {
				invoice: "paid",
			});
			expect((await result).summary.completedCount).toBe(missingSource ? 1 : 2);
			expect(JSON.stringify(fallbackWhere)).toContain('"amountDue":0');
			expect(JSON.stringify(fallbackWhere)).toContain(
				'"listProjection":{"is":null}',
			);
			expect(JSON.stringify(fallbackWhere)).toContain(
				'"itemControls":{"some":{"deletedAt":null,"produceable":true}}',
			);
			expect(JSON.stringify(fallbackWhere)).toContain(
				'"assignments":{"some":{"deletedAt":null}}',
			);
		},
	);

	it("preserves assignment detail scope across partial-rollout Completed branches", async () => {
		const previousMode = process.env.SALES_PIPELINE_READ_MODE;
		const previousPercent = process.env.SALES_PIPELINE_COHORT_PERCENT;
		process.env.SALES_PIPELINE_READ_MODE = "canonical";
		process.env.SALES_PIPELINE_COHORT_PERCENT = "5";
		try {
			let listSelect: unknown;
			const db = {
				$queryRaw: async () => [{ id: 11 }],
				salesOrderListProjection: { findMany: async () => [] },
				salesOrders: {
					count: async () => 0,
					findMany: async ({ select }: { select: Record<string, unknown> }) => {
						if (Object.keys(select).length > 1) listSelect = select;
						return [];
					},
				},
			};
			await getSalesProductions(db as unknown as Db, {
				tab: "completed",
				assignedToId: 17,
				includeMaterials: false,
				size: 20,
			});
			expect(JSON.stringify(listSelect)).toContain('"assignedToId":17');
		} finally {
			if (previousMode === undefined)
				Reflect.deleteProperty(process.env, "SALES_PIPELINE_READ_MODE");
			else process.env.SALES_PIPELINE_READ_MODE = previousMode;
			if (previousPercent === undefined)
				Reflect.deleteProperty(process.env, "SALES_PIPELINE_COHORT_PERCENT");
			else process.env.SALES_PIPELINE_COHORT_PERCENT = previousPercent;
		}
	});

	it.each(["fresh", "missing"] as const)(
		"validates all fallback pages with %s final source evidence",
		async (evidence) => {
			const rows = Array.from({ length: 251 }, (_, index) => ({
				...completedProductionRow(index + 1, "NORMAL"),
				createdAt: new Date("2026-07-01T12:00:00Z"),
			}));
			const cursors: number[] = [];
			const db = {
				orderItemProductionAssignments: {
					fields: fieldSource.orderItemProductionAssignments.fields,
					findMany: async () => [],
				},
				salesProductionSubmissionMaterialReview: { findMany: async () => [] },
				salesOrderListProjection: { findMany: async () => [] },
				salesOrders: {
					count: async ({
						where,
					}: {
						where: { AND?: Array<{ id?: { in?: number[] } }> };
					}) => where.AND?.find((part) => part.id?.in)?.id?.in?.length ?? 0,
					findMany: async ({
						where,
						select,
						take,
					}: {
						where: {
							id?: { in?: number[] };
							AND?: Array<{ id?: { gt?: number } }>;
						};
						select: Record<string, unknown>;
						take?: number;
					}) => {
						if (Object.keys(select).length === 1 && select.id) {
							const cursor =
								where.AND?.find((part) => part.id?.gt !== undefined)?.id?.gt ??
								0;
							cursors.push(cursor);
							expect(take).toBe(250);
							return rows
								.filter((row) => row.id > cursor)
								.slice(0, take)
								.map(({ id }) => ({ id }));
						}
						return rows.filter(
							(row) =>
								where.id?.in?.includes(row.id) &&
								!(evidence === "missing" && row.id === 251),
						);
					},
				},
			};
			expect(
				(await getSalesProductionSummary(db as unknown as Db, {})).summary
					.completedCount,
			).toBe(evidence === "missing" ? 250 : 251);
			expect(cursors).toEqual([0, 250]);
		},
	);

	it("requires every active assignment to have an owner for Ready", () => {
		const where = whereSales({
			production: "pending",
			"production.assignment": "all assigned",
		});
		const serialized = JSON.stringify(where);

		expect(serialized).toContain('"some"');
		expect(serialized).toContain('"none"');
		expect(serialized).toContain('"assignedToId":null');
		expect(serialized).toContain('"type":"prodAssigned"');
		expect(serialized).toContain('"percentage":100');
	});

	it("accepts live control quantity or positive assignment quantity for production queues", () => {
		const serialized = JSON.stringify(
			whereSales({
				production: "pending",
				"production.status": "unscheduled",
			}),
		);

		expect(serialized).toContain('"itemControls"');
		expect(serialized).toContain('"item":{"is":{"deletedAt":null}}');
		expect(serialized).toContain('"produceable":true');
		expect(serialized).toContain('"type":"qty"');
		expect(serialized).toContain('"total":{"gt":0}');
		expect(serialized).toContain('"items"');
		expect(serialized).toContain('"qtyAssigned":{"gt":0}');
	});

	it("uses active incomplete assignments for Due Today without a SalesStat gate", () => {
		const serialized = JSON.stringify(
			whereSales({
				production: "pending",
				"completion.production": "pending",
				"production.status": "due today",
			}),
		);

		expect(serialized).toContain('"assignments"');
		expect(serialized).toContain('"dueDate"');
		expect(serialized).toContain('"completedAt":null');
		expect(serialized).not.toContain('"type":"prodCompleted"');
	});

	it("uses the same active incomplete assignment rule for Past Due", () => {
		const serialized = JSON.stringify(
			whereSales({
				production: "pending",
				"completion.production": "pending",
				"production.status": "past due",
			}),
		);

		expect(serialized).toContain('"assignments"');
		expect(serialized).toContain('"completedAt":null');
		expect(serialized).not.toContain('"type":"prodCompleted"');
	});

	it("treats null-owner assignment rows as Unassigned", () => {
		const serialized = JSON.stringify(
			whereSales({
				production: "pending",
				"production.assignment": "not assigned",
			}),
		);

		expect(serialized).toContain('"none"');
		expect(serialized).toContain('"assignedToId":{"not":null}');
	});

	it("keeps the production queue available when material lookup fails", async () => {
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [
					{
						id: 42,
						orderId: "ORDER-42",
						createdAt: new Date("2026-07-28T12:00:00.000Z"),
						priority: "NORMAL",
						customer: null,
						billingAddress: null,
						salesRep: null,
						stat: [],
						itemControls: [],
						assignments: [],
						deliveries: [],
					},
				],
			},
			lineItem: {
				findMany: async () => {
					throw new Error("inventory unavailable");
				},
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			size: 20,
		});

		expect(result.data[0]?.materials.state).toBe("unavailable");
	});

	it("projects lifecycle status for batch completion eligibility", async () => {
		const row = {
			...completedProductionRow(43, "NORMAL"),
			status: "Completed",
		};
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [row],
			},
			salesOrderListProjection: {
				findMany: async () => [completedProjection(row)],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "completed",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data[0]?.lifecycleStatus).toBe("administratively_completed");
	});

	it("projects canonical completion satisfaction for status-only completed rows", async () => {
		const row = completedProductionRow(46, "NORMAL");
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [row],
			},
			salesOrderListProjection: {
				findMany: async () => [completedProjection(row)],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "completed",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data[0]).toMatchObject({
			completed: true,
			productionCompletionSatisfied: true,
		});
	});

	it("lets canonical Production state override a conflicting legacy completed label", async () => {
		const assignedAt = new Date("2026-07-02T12:00:00Z");
		const row = {
			...productionRow(47, "NORMAL"),
			prodStatus: "Completed",
			itemControls: [
				{
					uid: "control-47",
					produceable: true,
					shippable: false,
					qtyControls: [
						{
							type: "qty",
							total: 1,
							itemTotal: 1,
							qty: 1,
							updatedAt: assignedAt,
						},
					],
					assignments: [{ id: 97 }],
				},
			],
			assignments: [
				{
					id: 97,
					assignedAt,
					assignedToId: 17,
					createdAt: assignedAt,
					submissions: [],
					lhQty: 0,
					rhQty: 0,
					qtyAssigned: 1,
					qtyCompleted: 0,
					completedAt: null,
					dueDate: assignedAt,
					assignedTo: { name: "Worker" },
				},
			],
		};
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [row],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			includeMaterials: false,
			size: 20,
		});

		expect(result.data[0]).toMatchObject({
			completed: false,
			productionCompletionSatisfied: false,
			lifecycleStatus: "in_production",
			pipeline: { production: { state: "in_production" } },
		});
	});

	it("projects a read-only invoice total and payment status", async () => {
		const row = {
			...completedProductionRow(45, "NORMAL"),
			grandTotal: 1250,
			amountDue: 0,
		};
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [row],
			},
			salesOrderListProjection: {
				findMany: async () => [completedProjection(row)],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "completed",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data[0]?.invoice).toEqual({
			total: 1250,
			amountDue: 0,
			status: "paid",
		});
	});

	it("exposes canonical Production applicability conflicts on list rows", async () => {
		const row = {
			...productionRow(47, "NORMAL"),
			itemControls: [
				{
					produceable: false,
					shippable: true,
					qtyControls: [{ type: "qty", total: 1 }],
					assignments: [{ id: 901 }],
				},
			],
			assignments: [
				{
					id: 901,
					assignedAt: new Date("2026-09-02T08:00:00.000Z"),
					assignedToId: 17,
					createdAt: new Date("2026-09-02T08:00:00.000Z"),
					qtyAssigned: 1,
					qtyCompleted: 0,
					lhQty: 0,
					rhQty: 0,
					completedAt: null,
					dueDate: new Date("2026-09-02T09:00:00.000Z"),
					assignedTo: { name: "Worker" },
					submissions: [],
				},
			],
		};
		const db = {
			salesOrders: { findMany: async () => [row] },
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data[0]?.pipeline.production.applicability).toBe("conflict");
		expect(
			result.data[0]?.pipeline.capabilities.markProductionCompleted.allowed,
		).toBe(false);
	});

	it("excludes fulfilled deliveries in the canonical pending query", async () => {
		let capturedWhere: unknown;
		const db = {
			salesOrders: {
				findMany: async (args: { where?: unknown }) => {
					capturedWhere = args.where;
					return [];
				},
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data).toEqual([]);
		const serializedWhere = JSON.stringify(capturedWhere);
		expect(serializedWhere).toContain('"id":{"in":[]');
		expect(serializedWhere).not.toContain('"completionRecords"');
	});

	it("returns work completed by the authenticated worker before the full order completes", async () => {
		const incomplete = {
			...productionRow(1, "NORMAL"),
			assignments: [
				{
					qtyAssigned: 2,
					lhQty: 0,
					rhQty: 0,
					completedAt: null,
					dueDate: null,
					assignedTo: { name: "Worker" },
					submissions: [],
				},
			],
		};
		const complete = {
			...productionRow(2, "NORMAL"),
			assignments: [
				{
					qtyAssigned: 2,
					lhQty: 0,
					rhQty: 0,
					completedAt: null,
					dueDate: null,
					assignedTo: { name: "Worker" },
					submissions: [
						{
							qty: 2,
							lhQty: 0,
							rhQty: 0,
							materialReview: null,
						},
					],
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [incomplete, complete],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			workerId: 17,
			production: "completed",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data.map((row) => row.id)).toEqual([2]);
	});

	it("sorts production queue by priority before due date", () => {
		const sorted = sortProductionListByPriority([
			{
				orderId: "NORMAL-DUE-FIRST",
				priority: "NORMAL",
				dueDate: "2026-05-14",
			},
			{ orderId: "LOW", priority: "LOW", dueDate: "2026-05-13" },
			{ orderId: "CRITICAL", priority: "CRITICAL", dueDate: "2026-05-16" },
			{ orderId: "HIGH", priority: "HIGH", dueDate: "2026-05-15" },
		]);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"CRITICAL",
			"HIGH",
			"NORMAL-DUE-FIRST",
			"LOW",
		]);
	});

	it("uses due date within the same priority", () => {
		const sorted = sortProductionListByPriority([
			{ orderId: "LATER", priority: "HIGH", dueDate: "2026-05-18" },
			{ orderId: "SOONER", priority: "HIGH", dueDate: "2026-05-15" },
		]);

		expect(sorted.map((item) => item.orderId)).toEqual(["SOONER", "LATER"]);
	});

	it("sorts by soonest due date with missing due dates last", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "NO-DATE", priority: "CRITICAL", dueDate: null },
				{ orderId: "LATER", priority: "LOW", dueDate: "2026-05-18" },
				{ orderId: "SOONER", priority: "NORMAL", dueDate: "2026-05-15" },
			],
			"dueDateAsc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"SOONER",
			"LATER",
			"NO-DATE",
		]);
	});

	it("sorts by latest due date with missing due dates last", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "NO-DATE", priority: "CRITICAL", dueDate: null },
				{ orderId: "LATER", priority: "LOW", dueDate: "2026-05-18" },
				{ orderId: "SOONER", priority: "NORMAL", dueDate: "2026-05-15" },
			],
			"dueDateDesc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"LATER",
			"SOONER",
			"NO-DATE",
		]);
	});

	it("uses priority as the tie-breaker for matching due dates", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "LOW", priority: "LOW", dueDate: "2026-05-15" },
				{ orderId: "CRITICAL", priority: "CRITICAL", dueDate: "2026-05-15" },
			],
			"dueDateAsc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual(["CRITICAL", "LOW"]);
	});

	it("sorts newest orders first with id as a stable tie-breaker", () => {
		const sorted = sortProductionListByPriority(
			[
				{ id: 10, orderId: "OLDER", createdAt: "2026-05-14" },
				{ id: 12, orderId: "NEWER", createdAt: "2026-05-16" },
				{ id: 11, orderId: "SAME-DAY-HIGHER-ID", createdAt: "2026-05-14" },
			],
			"newest",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"NEWER",
			"SAME-DAY-HIGHER-ID",
			"OLDER",
		]);
	});

	it("sorts oldest orders first with id as a stable tie-breaker", () => {
		const sorted = sortProductionListByPriority(
			[
				{ id: 12, orderId: "NEWER", createdAt: "2026-05-16" },
				{ id: 11, orderId: "SAME-DAY-HIGHER-ID", createdAt: "2026-05-14" },
				{ id: 10, orderId: "OLDER", createdAt: "2026-05-14" },
			],
			"oldest",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"OLDER",
			"SAME-DAY-HIGHER-ID",
			"NEWER",
		]);
	});
});

describe("sales production completion detection", () => {
	it("treats a fully completed production stat as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 100 },
				totalAssigned: 4,
				totalCompleted: 0,
				totalProductionQty: 4,
			}),
		).toBe(true);
	});

	it("treats fully submitted due assignments as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 50 },
				totalAssigned: 2,
				totalCompleted: 2,
				totalProductionQty: 4,
				useAssignmentCompletion: true,
			}),
		).toBe(true);
	});

	it("does not let partial assignment submissions count as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 50 },
				totalAssigned: 4,
				totalCompleted: 2,
				totalProductionQty: 4,
				useAssignmentCompletion: true,
			}),
		).toBe(false);
	});
});
