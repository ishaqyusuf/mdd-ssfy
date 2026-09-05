import { describe, expect, it } from "bun:test";
import { dispatchBacklogSchema } from "@api/schemas/dispatch-workspace";
import type { TRPCContext } from "@api/trpc/init";
import { getDispatches } from "./dispatch";
import { getDispatchBacklog } from "./dispatch-workspace";

const now = new Date("2026-09-05T00:00:00.000Z");

function orderRow(id: number) {
	return {
		id,
		orderId: `ORDER-${id}`,
		slug: `order-${id}`,
		status: "open",
		prodStatus: "pending",
		grandTotal: 100,
		amountDue: 0,
		meta: {},
		payments: [],
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		archivedAt: null,
	};
}

function pipelineRow(id: number) {
	return {
		...orderRow(id),
		inventoryProjection: { needCount: 0, status: "ready", updatedAt: now },
		stat: [],
		completionRecords: [],
		itemControls: [
			{
				uid: `item-${id}`,
				produceable: true,
				shippable: true,
				qtyControls: [
					{ type: "qty", total: 2, itemTotal: 2, qty: 2, updatedAt: now },
				],
			},
		],
		assignments: [
			{
				id: id * 10,
				assignedToId: 44,
				qtyAssigned: 1,
				qtyCompleted: 0,
				dueDate: now,
				assignedAt: null,
				completedAt: null,
				updatedAt: now,
				submissions: [],
			},
		],
		deliveries: [],
	};
}

describe("Fulfillment query headline parity", () => {
	it.each(["true", "false"])(
		"uses the order headline without replacing dispatch status (control V2=%s)",
		async (controlReadV2) => {
			const keys = [
				"SALES_PIPELINE_READ_MODE",
				"SALES_PIPELINE_COHORT_PERCENT",
				"CONTROL_READ_V2",
				"CONTROL_READ_PARITY",
			] as const;
			const previous = Object.fromEntries(
				keys.map((key) => [key, process.env[key]]),
			);
			process.env.SALES_PIPELINE_READ_MODE = "canonical";
			process.env.SALES_PIPELINE_COHORT_PERCENT = "100";
			process.env.CONTROL_READ_V2 = controlReadV2;
			process.env.CONTROL_READ_PARITY = "false";
			const evidenceReads: number[][] = [];
			const db = {
				salesOrders: {
					findMany: async (args: { where: { id: { in: number[] } } }) => {
						evidenceReads.push(args.where.id.in);
						return args.where.id.in.map(pipelineRow);
					},
				},
				salesItemControl: { findMany: async () => [] },
				orderItemDelivery: { findMany: async () => [] },
				orderDelivery: {
					count: async () => 2,
					findMany: async (args: { select: { order?: unknown } }) =>
						args.select.order
							? [1, 2].map((id) => ({
									id,
									status: "queue",
									salesOrderId: 42,
									meta: {},
									createdAt: now,
									updatedAt: now,
									dueDate: now,
									deletedAt: null,
									deliveredAt: null,
									deliveryMode: "delivery",
									driverId: null,
									_count: { items: 1, stockAllocations: 0, exceptions: 0 },
									order: { ...orderRow(42), stat: [] },
									driver: null,
								}))
							: [],
				},
			};
			try {
				const result = await getDispatches({ db } as unknown as TRPCContext, {
					size: 2,
				});
				expect(result.data).toHaveLength(2);
				for (const row of result.data) {
					expect(row.order).toMatchObject({
						status: "production_queued",
						statusLabel: "Production queued",
						statusTone: "amber",
						productionState: "partially_assigned",
					});
					expect(row.dispatchRecordStatus).toBe("queue");
					expect(row.order).not.toHaveProperty("assignments");
					expect(row.pipeline).not.toHaveProperty("evidence");
				}
				expect(evidenceReads).toEqual([[42]]);
			} finally {
				for (const key of keys) process.env[key] = previous[key];
			}
		},
	);

	it("loads canonical evidence only for the returned backlog page and preserves pagination", async () => {
		const previous = {
			mode: process.env.SALES_PIPELINE_READ_MODE,
			cohort: process.env.SALES_PIPELINE_COHORT_PERCENT,
		};
		process.env.SALES_PIPELINE_READ_MODE = "canonical";
		process.env.SALES_PIPELINE_COHORT_PERCENT = "100";
		const evidenceReads: number[][] = [];
		const db = {
			salesOrders: {
				count: async () => 100,
				findMany: async (args: {
					select: { assignments?: unknown };
					where: { id?: { in: number[] } };
					take?: number;
					skip?: number;
				}) => {
					if (args.select.assignments) {
						const ids = args.where.id?.in ?? [];
						evidenceReads.push(ids);
						return ids.map(pipelineRow);
					}
					expect(args.take).toBe(2);
					expect(args.skip).toBe(20);
					return [orderRow(42), orderRow(43)];
				},
			},
			salesItemControl: { findMany: async () => [] },
			orderDelivery: { findMany: async () => [] },
			orderItemDelivery: { findMany: async () => [] },
		};
		try {
			const result = await getDispatchBacklog(
				{ db } as unknown as TRPCContext,
				dispatchBacklogSchema.parse({ size: 2, cursor: "20" }),
			);
			expect(
				result.data.map(
					({ id, status, statusLabel, statusTone, productionState }) => ({
						id,
						status,
						statusLabel,
						statusTone,
						productionState,
					}),
				),
			).toEqual(
				[42, 43].map((id) => ({
					id,
					status: "production_queued",
					statusLabel: "Production queued",
					statusTone: "amber",
					productionState: "partially_assigned",
				})),
			);
			expect(result.meta).toMatchObject({ count: 100, size: 2, cursor: "22" });
			expect(evidenceReads).toEqual([[42, 43]]);
		} finally {
			process.env.SALES_PIPELINE_READ_MODE = previous.mode;
			process.env.SALES_PIPELINE_COHORT_PERCENT = previous.cohort;
		}
	});
});
