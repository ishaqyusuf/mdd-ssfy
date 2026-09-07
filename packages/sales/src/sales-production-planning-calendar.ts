import type { Db } from "@gnd/db";
import { normalizeSalesPriority } from "./priority";
import { getProductionCalendarPresentation } from "./production-calendar-presentation";
import {
	getProductionDateRange,
	getProductionDueDatePresentation,
} from "./production-date";
import { resolveProductionPlanningGap } from "./production-planning";
import { getSalesPipelineProductionStateLabel } from "./sales-pipeline";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";
import type {
	SalesProductionCalendarQuery,
	SalesQueryParamsSchema,
} from "./schema";
import { whereSales } from "./utils/where-queries";

const PLANNING_CANDIDATE_LIMIT = 1_500;

export function productionPlanningRange(from: string, to: string) {
	const start = getProductionDateRange(from).gte;
	const requestedEnd = getProductionDateRange(to).lt;
	if (requestedEnd <= start) {
		throw new Error("Production calendar end date must not precede its start.");
	}
	const end = new Date(
		Math.min(requestedEnd.getTime(), start.getTime() + 42 * 86_400_000),
	);
	return { gte: start, lt: end };
}

/** Admin-only projection. Callers must establish workspace read permission. */
export async function getSalesProductionPlanningCalendar(
	db: Db,
	input: Pick<SalesProductionCalendarQuery, "from" | "to" | "q" | "priority">,
	options: { canAssign?: boolean; now?: Date } = {},
) {
	const range = productionPlanningRange(input.from, input.to);
	const rows = await db.salesOrders.findMany({
		where: {
			AND: [
				whereSales({
					salesType: "order",
					q: input.q,
					"sales.priority": input.priority,
				} as SalesQueryParamsSchema) || {},
				{
					type: "order",
					deletedAt: null,
					archivedAt: null,
					prodDueDate: range,
				},
			],
		},
		select: {
			id: true,
			orderId: true,
			slug: true,
			prodDueDate: true,
			priority: true,
			customer: { select: { name: true, businessName: true } },
			assignments: {
				where: { deletedAt: null },
				select: { id: true, assignedTo: { select: { name: true } } },
			},
		},
		orderBy: [{ prodDueDate: "asc" }, { id: "asc" }],
		take: PLANNING_CANDIDATE_LIMIT + 1,
	});
	const truncated = rows.length > PLANNING_CANDIDATE_LIMIT;
	const candidates = rows.slice(0, PLANNING_CANDIDATE_LIMIT);
	// The existing canonical loader batches evidence by order IDs, not per card.
	const snapshots = await getSalesPipelineSnapshots(
		db,
		candidates.map((row) => row.id),
	);
	const planning = candidates.flatMap((row) => {
		const pipeline = snapshots.get(row.id);
		if (!pipeline) {
			throw new Error(
				"Production planning evidence changed. Refresh and retry.",
			);
		}
		const gap = resolveProductionPlanningGap(pipeline, {
			authorizedToAssign: options.canAssign === true,
		});
		if (!gap || !row.prodDueDate) return [];
		const assignmentIds = new Set(pipeline.production.assignmentIds);
		return [
			{
				...gap,
				id: `planning:${row.id}`,
				orderId: row.id,
				orderNo: row.orderId,
				slug: row.slug,
				customer:
					row.customer?.businessName ||
					row.customer?.name ||
					"Customer unavailable",
				dueDate: row.prodDueDate.toISOString().slice(0, 10),
				dateProvenance: "Order production due date" as const,
				due: getProductionDueDatePresentation(row.prodDueDate, {
					now: options.now,
				}),
				priority: normalizeSalesPriority(row.priority),
				workers: Array.from(
					new Set(
						row.assignments
							.filter((assignment) => assignmentIds.has(assignment.id))
							.flatMap((assignment) =>
								assignment.assignedTo?.name ? [assignment.assignedTo.name] : [],
							),
					),
				).sort(),
				production: pipeline.production,
				presentation: getProductionCalendarPresentation(pipeline, true),
				productionLabel: getSalesPipelineProductionStateLabel(
					pipeline.production.state,
				),
				headline: pipeline.headline,
				material: pipeline.material,
				completion: pipeline.evidence.production.administrativeCompletion,
				provenance: pipeline.provenance,
				expectedEvidenceRevision: pipeline.revision,
			},
		];
	});
	const counts = new Map<string, number>();
	for (const row of planning)
		counts.set(row.dueDate, (counts.get(row.dueDate) || 0) + 1);
	const days: Array<{ date: string; count: number }> = [];
	for (
		let timestamp = range.gte.getTime();
		timestamp < range.lt.getTime();
		timestamp += 86_400_000
	) {
		const date = new Date(timestamp).toISOString().slice(0, 10);
		days.push({ date, count: counts.get(date) || 0 });
	}
	return {
		kind: "planning" as const,
		planning,
		days,
		count: planning.length,
		truncated,
	};
}
