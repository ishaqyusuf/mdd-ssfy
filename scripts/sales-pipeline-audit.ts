import { Prisma, db } from "@gnd/db";
import {
	getSalesProductionCalendar,
	getSalesProductionSummary,
	getSalesProductions,
} from "@gnd/sales/sales-production";
import dayjs from "@gnd/utils/dayjs";

type CountRow = { count: bigint | number | string };
type SampleRow = {
	id: number;
	orderNo: string;
	dueDate: Date | null;
	assignmentId: number | null;
	aggregateTotal: number | null;
	aggregateScore: number | null;
	aggregatePercentage: number | null;
	classification: string;
};

function count(row: CountRow | undefined) {
	return Number(row?.count ?? 0);
}

async function main() {
	const operationalDate = dayjs().format("YYYY-MM-DD");
	const todayStart = dayjs(operationalDate).startOf("day").toDate();
	const tomorrowStart = dayjs(operationalDate)
		.add(1, "day")
		.startOf("day")
		.toDate();
	const assignedQuantity = Prisma.sql`COALESCE(NULLIF(soa.qtyAssigned, 0), COALESCE(soa.lhQty, 0) + COALESCE(soa.rhQty, 0), 0)`;
	const submittedQuantity = Prisma.sql`(
		SELECT COALESCE(SUM(
			CASE WHEN COALESCE(ops.qty, 0) > 0
				THEN ops.qty
				ELSE COALESCE(ops.lhQty, 0) + COALESCE(ops.rhQty, 0)
			END
		), 0)
		FROM OrderProductionSubmissions ops
		LEFT JOIN SalesProductionSubmissionMaterialReview review
			ON review.id = ops.materialReviewId
		WHERE ops.assignmentId = soa.id
			AND ops.deletedAt IS NULL
			AND (ops.materialReviewId IS NULL OR review.status = 'APPROVED')
	)`;
	const openAssignment = Prisma.sql`
		soa.completedAt IS NULL
		AND ${assignedQuantity} > 0
		AND GREATEST(COALESCE(soa.qtyCompleted, 0), ${submittedQuantity}) < ${assignedQuantity}
	`;

	const [
		dueToday,
		pastDue,
		aggregateDrift,
		softDeleted,
		notRequiredConflict,
		zeroItemDispatches,
		administrativeProduction,
		administrativeFulfillment,
		samples,
	] = await Promise.all([
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(DISTINCT soa.orderId) AS count
				FROM OrderItemProductionAssignments soa
				JOIN SalesOrders so ON so.id = soa.orderId
				WHERE soa.deletedAt IS NULL
					AND ${openAssignment}
					AND soa.dueDate >= ${todayStart}
					AND soa.dueDate < ${tomorrowStart}
					AND so.deletedAt IS NULL
					AND so.type = 'order'
			`,
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(DISTINCT soa.orderId) AS count
				FROM OrderItemProductionAssignments soa
				JOIN SalesOrders so ON so.id = soa.orderId
				WHERE soa.deletedAt IS NULL
					AND ${openAssignment}
					AND soa.dueDate < ${todayStart}
					AND so.deletedAt IS NULL
					AND so.type = 'order'
			`,
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(DISTINCT soa.orderId) AS count
				FROM OrderItemProductionAssignments soa
				JOIN SalesOrders so ON so.id = soa.orderId
				LEFT JOIN SalesStat ss
					ON ss.salesId = so.id
					AND ss.type = 'prodCompleted'
					AND ss.deletedAt IS NULL
				WHERE soa.deletedAt IS NULL
					AND ${openAssignment}
					AND so.deletedAt IS NULL
					AND so.type = 'order'
					AND (
						ss.salesId IS NULL
						OR COALESCE(ss.total, 0) = 0
						OR COALESCE(ss.percentage, 0) >= 100
					)
			`,
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(DISTINCT soa.orderId) AS count
				FROM OrderItemProductionAssignments soa
				JOIN SalesOrders so ON so.id = soa.orderId
				WHERE soa.deletedAt IS NULL
					AND so.deletedAt IS NOT NULL
			`,
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(DISTINCT so.id) AS count
				FROM SalesOrders so
				JOIN OrderItemProductionAssignments soa ON soa.orderId = so.id
				WHERE so.deletedAt IS NULL
					AND so.type = 'order'
					AND soa.deletedAt IS NULL
					AND NOT EXISTS (
						SELECT 1 FROM SalesItemControl sic
						WHERE sic.salesId = so.id
							AND sic.deletedAt IS NULL
							AND sic.produceable = TRUE
					)
			`,
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(*) AS count
				FROM OrderDelivery delivery
				WHERE delivery.deletedAt IS NULL
					AND NOT EXISTS (
						SELECT 1 FROM OrderItemDelivery item
						WHERE item.orderDeliveryId = delivery.id
							AND item.deletedAt IS NULL
					)
			`,
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(DISTINCT salesOrderId) AS count
				FROM SalesCompletionRecord
				WHERE state = 'ACTIVE'
					AND completionMethod = 'STATUS_ONLY'
					AND milestone = 'PRODUCTION_COMPLETED'
			`,
		db.$queryRaw<CountRow[]>`
				SELECT COUNT(DISTINCT salesOrderId) AS count
				FROM SalesCompletionRecord
				WHERE state = 'ACTIVE'
					AND completionMethod = 'STATUS_ONLY'
					AND milestone = 'FULFILLMENT_COMPLETED'
			`,
		db.$queryRaw<SampleRow[]>`
				SELECT
					so.id,
					so.orderId AS orderNo,
					soa.dueDate,
					soa.id AS assignmentId,
					ss.total AS aggregateTotal,
					ss.score AS aggregateScore,
					ss.percentage AS aggregatePercentage,
					CASE
						WHEN ss.salesId IS NULL THEN 'missing_aggregate'
						WHEN COALESCE(ss.total, 0) = 0 THEN 'zero_aggregate'
						WHEN COALESCE(ss.percentage, 0) >= 100 THEN 'aggregate_claims_complete'
						ELSE 'aligned_open'
					END AS classification
				FROM OrderItemProductionAssignments soa
				JOIN SalesOrders so ON so.id = soa.orderId
				LEFT JOIN SalesStat ss
					ON ss.salesId = so.id
					AND ss.type = 'prodCompleted'
					AND ss.deletedAt IS NULL
				WHERE soa.deletedAt IS NULL
					AND ${openAssignment}
					AND so.deletedAt IS NULL
					AND so.type = 'order'
					AND (
						ss.salesId IS NULL
						OR COALESCE(ss.total, 0) = 0
						OR COALESCE(ss.percentage, 0) >= 100
					)
				ORDER BY soa.dueDate ASC, so.id ASC
				LIMIT 20
			`,
	]);
	const [productionSummary, productionCalendar, productionDueToday] =
		await Promise.all([
			getSalesProductionSummary(db, {}),
			getSalesProductionCalendar(db, {
				from: operationalDate,
				to: operationalDate,
				scope: "open",
			}),
			getSalesProductions(db, {
				due: "today",
				productionSort: "dueDateAsc",
				includeMaterials: false,
				size: 100,
			}),
		]);

	console.log(
		JSON.stringify(
			{
				contract: "sales-pipeline-audit/v1",
				mode: "read-only",
				operationalDate,
				counts: {
					dueTodayUniqueOrders: count(dueToday[0]),
					pastDueUniqueOrders: count(pastDue[0]),
					activeAssignmentOrdersWithAggregateDrift: count(aggregateDrift[0]),
					softDeletedOrdersWithAssignmentEvidence: count(softDeleted[0]),
					productionNotRequiredConfigurationConflicts: count(
						notRequiredConflict[0],
					),
					zeroItemDispatches: count(zeroItemDispatches[0]),
					administrativeProductionCompletions: count(
						administrativeProduction[0],
					),
					administrativeFulfillmentCompletions: count(
						administrativeFulfillment[0],
					),
				},
				surfaceParity: {
					dueTodaySummary: productionSummary.summary.dueTodayCount,
					dueTodayCalendarUniqueOrders: new Set(
						productionCalendar.scheduled.map((row) => row.orderId),
					).size,
					dueTodayListUniqueOrders: new Set(
						productionDueToday.data.map((row) => row.id),
					).size,
					dueTodayOrderNumbers: Array.from(
						new Set(productionCalendar.scheduled.map((row) => row.orderNo)),
					),
				},
				samples,
			},
			(_key, value) => (typeof value === "bigint" ? Number(value) : value),
			2,
		),
	);
}

try {
	await main();
} finally {
	await db.$disconnect();
}
