import type { Db, Prisma } from "@gnd/db";
import { sum } from "@gnd/utils";
import dayjs, { formatDate } from "@gnd/utils/dayjs";
import { type PageDataMeta, composeQueryData } from "@gnd/utils/query-response";
import { hasCompletedProductionLifecycle } from "./bulk-production-completion";
import { getSalesOrderLifecycleStatusInfo } from "./order-status";
import {
	getSalesPriorityLabel,
	getSalesPriorityRank,
	normalizeSalesPriority,
} from "./priority";
import { isFinalizedProductionSubmission } from "./production-submission-review/policy";
import {
	type ProductionMaterialStatus,
	buildProductionMaterialStatuses,
	summarizeProductionMaterials,
	unavailableProductionMaterialSummary,
} from "./production-v2/application/production-materials";
import { resolveProductionWorkflowStatus } from "./production-workflow-status";
import { resolveSalesProductionWorkspaceQuery } from "./production-workspace-query";
import { getSalesProductionPlan } from "./sales-fulfillment-plan";
import { resolveSalesInventoryFulfillmentStatus } from "./sales-inventory-policy";
import type {
	SalesProductionCalendarQuery,
	SalesProductionQueryParams,
	SalesQueryParamsSchema,
} from "./schema";
import {
	composeSalesStatKeyValue,
	dueDateAlert,
	overallStatus,
} from "./utils/utils";
import { whereSales } from "./utils/where-queries";

export type ProductionListSort =
	| "priority"
	| "dueDateAsc"
	| "dueDateDesc"
	| "newest"
	| "oldest";

type SalesProductionListQuery = SalesProductionQueryParams & {
	productionSort?: ProductionListSort | null;
	includeMaterials?: boolean;
	"production.assignedToId"?: number | null;
	"production.status"?: SalesQueryParamsSchema["production.status"];
};

export async function getSalesProductions(
	db: Db,
	input: SalesProductionListQuery,
) {
	const resolved = resolveSalesProductionWorkspaceQuery(input);
	const query = {
		...input,
		...resolved.list,
	} as SalesProductionListQuery;
	const assignedToId = query.workerId || query.assignedToId;
	const normalizedQuery = {
		...query,
		"production.assignedToId":
			query["production.assignedToId"] || assignedToId || undefined,
	};
	const { sort: _canonicalSort, ...productionQuery } = normalizedQuery;
	const getDueQueue = async (
		status: NonNullable<SalesQueryParamsSchema["production.status"]>,
	) => {
		const { show: _show, ...dueQuery } = productionQuery;
		return filterCompletedProductions(
			await getProductionListAction(
				db,
				{
					...dueQuery,
					salesType: "order",
					"production.status": status,
					"sales.priority": query.priority || query["sales.priority"],
				},
				{
					includeMaterials: query.includeMaterials,
				},
			),
		);
	};
	const getDueToday = async () => getDueQueue("due today");
	const getPastDue = async () => getDueQueue("past due");
	const getDueTomorrow = async () => getDueQueue("due tomorrow");
	const getFuture = async () => getDueQueue("future");
	const getUnscheduled = async () => getDueQueue("unscheduled");
	switch (query.show) {
		case "due-today":
			return await getDueToday();
		case "due-tomorrow":
			return await getDueTomorrow();
		case "past-due":
			return await getPastDue();
		case "future":
			return await getFuture();
		case "unscheduled":
			return await getUnscheduled();
	}
	const workerCompleted = !!query.workerId && query.production === "completed";
	const listQuery = workerCompleted
		? { ...productionQuery, production: undefined }
		: productionQuery;
	const response = await getProductionListAction(
		db,
		{
			...listQuery,
			"sales.priority": query.priority || query["sales.priority"],
			salesType: "order",
			//   "production.status": "part assigned",
		},
		{
			includeMaterials: query.includeMaterials,
			workerCompletion: workerCompleted ? "completed" : undefined,
		},
	);
	return query.production === "pending"
		? filterCompletedProductions(response)
		: response;
	//   const others = prodList.filter((p) => !excludesIds?.includes(p.id));
}

export async function getSalesProductionDashboard(
	db: Db,
	input: SalesProductionListQuery,
) {
	const resolved = resolveSalesProductionWorkspaceQuery(input);
	const query = {
		...input,
		...resolved.list,
	} as SalesProductionListQuery;
	const assignedToId = query.workerId || query.assignedToId;
	const baseQuery: SalesProductionQueryParams = {
		q: query.q,
		"customer.name": query["customer.name"],
		phone: query.phone,
		po: query.po,
		item: query.item,
		"sales.rep": query["sales.rep"],
		invoice: query.invoice,
		salesNo: query.salesNo,
		priority: query.priority,
		assignedToId,
		workerId: query.workerId,
		production: "pending",
	};

	const [
		{ summary },
		spotlight,
		dueToday,
		dueTomorrow,
		pastDue,
		calendarResult,
	] = await Promise.all([
		getSalesProductionSummary(db, input),
		getSalesProductions(db, {
			...baseQuery,
			size: 6,
			includeMaterials: false,
		}),
		getSalesProductions(db, {
			...baseQuery,
			show: "due-today",
			size: 8,
			includeMaterials: false,
		}),
		getSalesProductions(db, {
			...baseQuery,
			show: "due-tomorrow",
			size: 8,
			includeMaterials: false,
		}),
		getSalesProductions(db, {
			...baseQuery,
			show: "past-due",
			size: 8,
			includeMaterials: false,
		}),
		getSalesProductionCalendar(db, {
			from: dayjs().format("YYYY-MM-DD"),
			to: dayjs().add(9, "day").format("YYYY-MM-DD"),
			q: baseQuery.q,
			priority: baseQuery.priority,
			assignedToId,
		}),
	]);

	return {
		summary,
		alerts: {
			pastDue: pastDue.data.slice(0, 8),
			dueToday: dueToday.data.slice(0, 8),
			dueTomorrow: dueTomorrow.data.slice(0, 8),
		},
		calendar: calendarResult.days,
		spotlight: spotlight.data,
	};
}

export async function getSalesProductionSummary(
	db: Db,
	input: SalesProductionListQuery,
) {
	const resolved = resolveSalesProductionWorkspaceQuery(input);
	const query = {
		...input,
		...resolved.list,
	} as SalesProductionListQuery;
	const assignedToId = query.workerId || query.assignedToId;
	const baseQuery: SalesProductionQueryParams = {
		q: query.q,
		"customer.name": query["customer.name"],
		phone: query.phone,
		po: query.po,
		item: query.item,
		"sales.rep": query["sales.rep"],
		invoice: query.invoice,
		salesNo: query.salesNo,
		priority: query.priority,
		assignedToId,
		workerId: query.workerId,
		production: "pending",
	};
	const [
		queueCount,
		unassignedCount,
		dueTodayCount,
		dueTomorrowCount,
		pastDueCount,
		futureCount,
		unscheduledCount,
		completedCount,
		awaitingReviewCount,
	] = await Promise.all([
		countProductionOrders(db, baseQuery),
		countProductionOrders(db, {
			...baseQuery,
			"production.assignment": "not assigned",
		}),
		countProductionOrders(db, {
			...baseQuery,
			"production.status": "due today",
		}),
		countProductionOrders(db, {
			...baseQuery,
			"production.status": "due tomorrow",
		}),
		countProductionOrders(db, {
			...baseQuery,
			"production.status": "past due",
		}),
		countProductionOrders(db, {
			...baseQuery,
			"production.status": "future",
		}),
		countProductionOrders(db, {
			...baseQuery,
			"production.status": "unscheduled",
		}),
		query.workerId
			? countWorkerCompletedProductionOrders(db, {
					q: baseQuery.q,
					priority: baseQuery.priority,
					workerId: query.workerId,
				})
			: countProductionOrders(db, {
					q: baseQuery.q,
					priority: baseQuery.priority,
					assignedToId,
					production: "completed",
				}),
		db.salesProductionSubmissionMaterialReview.count({
			where: { status: "PENDING" },
		}),
	]);
	return {
		summary: {
			queueCount,
			unassignedCount,
			dueTodayCount,
			dueTomorrowCount,
			pastDueCount,
			futureCount,
			unscheduledCount,
			completedCount,
			awaitingReviewCount,
		},
	};
}

export async function getSalesProductionCalendar(
	db: Db,
	input: SalesProductionCalendarQuery,
) {
	const start = dayjs(input.from).startOf("day");
	const requestedEnd = dayjs(input.to).startOf("day");
	const end =
		requestedEnd.diff(start, "day") > 41 ? start.add(41, "day") : requestedEnd;
	const exclusiveEnd = end.add(1, "day");
	const orderWhere = whereSales({
		salesType: "order",
		q: input.q,
		"sales.priority": input.priority,
	} as SalesQueryParamsSchema);
	const activeWhere = {
		deletedAt: null,
		assignedToId: input.assignedToId || undefined,
		order: orderWhere,
	} satisfies Prisma.OrderItemProductionAssignmentsWhereInput;
	const calendarSelect = {
		id: true,
		assignedToId: true,
		startedAt: true,
		completedAt: true,
		dueDate: true,
		assignedTo: { select: { name: true } },
		order: {
			select: {
				id: true,
				orderId: true,
				priority: true,
				customer: { select: { name: true, businessName: true } },
			},
		},
	} satisfies Prisma.OrderItemProductionAssignmentsSelect;
	const scheduledRows = await db.orderItemProductionAssignments.findMany({
		where: {
			...activeWhere,
			dueDate: { gte: start.toDate(), lt: exclusiveEnd.toDate() },
		},
		orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
		take: 1_500,
		select: calendarSelect,
	});
	const toCalendarRow = (row: (typeof scheduledRows)[number]) => ({
		id: row.id,
		orderId: row.order.id,
		orderNo: row.order.orderId,
		customer:
			row.order.customer?.businessName ||
			row.order.customer?.name ||
			"Customer unavailable",
		priority: normalizeSalesPriority(row.order.priority),
		assignedTo: row.assignedTo?.name || null,
		dueDate: row.dueDate?.toISOString() || null,
		status: row.completedAt
			? "completed"
			: row.startedAt
				? "in progress"
				: row.assignedToId
					? "assigned"
					: "unassigned",
	});
	const collapseCalendarRows = (rows: typeof scheduledRows) => {
		const groups = new Map<
			string,
			{
				row: ReturnType<typeof toCalendarRow>;
				assignedTo: Set<string>;
				statuses: Set<string>;
				assignmentCount: number;
			}
		>();

		for (const source of rows) {
			const row = toCalendarRow(source);
			const date = row.dueDate
				? dayjs(row.dueDate).format("YYYY-MM-DD")
				: "unscheduled";
			const key = `${row.orderId}:${date}`;
			const existing = groups.get(key);
			if (existing) {
				existing.assignmentCount += 1;
				existing.statuses.add(row.status);
				if (row.assignedTo) existing.assignedTo.add(row.assignedTo);
				continue;
			}

			groups.set(key, {
				row,
				assignedTo: new Set(row.assignedTo ? [row.assignedTo] : []),
				statuses: new Set([row.status]),
				assignmentCount: 1,
			});
		}

		return Array.from(groups.values()).map((group) => ({
			...group.row,
			assignedTo: Array.from(group.assignedTo).join(" & ") || null,
			assignmentCount: group.assignmentCount,
			status: group.statuses.has("in progress")
				? "in progress"
				: group.statuses.has("unassigned")
					? "unassigned"
					: group.statuses.has("assigned")
						? "assigned"
						: "completed",
		}));
	};
	const scheduled = collapseCalendarRows(scheduledRows);
	const counts = new Map<string, number>();
	for (const row of scheduledRows) {
		if (!row.dueDate) continue;
		const date = dayjs(row.dueDate).format("YYYY-MM-DD");
		counts.set(date, (counts.get(date) || 0) + 1);
	}
	const today = dayjs().format("YYYY-MM-DD");
	const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
	const days: Array<{
		date: string;
		label: string;
		shortLabel: string;
		count: number;
		isToday: boolean;
		isTomorrow: boolean;
	}> = [];
	for (let index = 0; index <= end.diff(start, "day"); index++) {
		const current = start.add(index, "day");
		const date = current.format("YYYY-MM-DD");
		days.push({
			date,
			label: current.format("ddd, MMM D"),
			shortLabel: current.format("ddd"),
			count: counts.get(date) || 0,
			isToday: date === today,
			isTomorrow: date === tomorrow,
		});
	}
	return { days, scheduled };
}

async function countProductionOrders(
	db: Db,
	query: SalesProductionListQuery & Record<string, unknown>,
) {
	const { sort: _canonicalSort, ...countQuery } = query;
	return db.salesOrders.count({
		where: whereSales({
			...countQuery,
			salesType: "order",
			"production.assignedToId":
				query["production.assignedToId"] ||
				query.workerId ||
				query.assignedToId ||
				undefined,
			"sales.priority": query.priority || query["sales.priority"],
		} as SalesQueryParamsSchema),
	});
}

async function countWorkerCompletedProductionOrders(
	db: Db,
	query: Pick<SalesProductionListQuery, "q" | "priority" | "workerId">,
) {
	const workerId = Number(query.workerId || 0);
	if (!workerId) return 0;

	const whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[] = [
		{ assignedToId: workerId, deletedAt: null },
	];
	const completionSelect = selectWorkerCompletion(whereAssignments);
	const where = whereSales({
		q: query.q,
		salesType: "order",
		"sales.priority": query.priority,
		"production.assignedToId": workerId,
	} as SalesQueryParamsSchema);
	let skip = 0;
	let completedCount = 0;
	const batchSize = 250;

	while (true) {
		const records = await db.salesOrders.findMany({
			where,
			orderBy: { id: "asc" },
			skip,
			take: batchSize,
			select: completionSelect,
		});
		for (const item of records) {
			if (isWorkerCompletionRecordCompleted(item)) {
				completedCount += 1;
			}
		}
		skip += records.length;
		if (records.length < batchSize) break;
	}

	return completedCount;
}

const selectWorkerCompletion = (
	whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[],
) =>
	({
		stat: true,
		assignments: {
			where: {
				deletedAt: null,
				AND: whereAssignments.length > 1 ? whereAssignments : undefined,
				...(whereAssignments.length === 1 ? whereAssignments[0] : {}),
			},
			select: {
				lhQty: true,
				rhQty: true,
				qtyAssigned: true,
				completedAt: true,
				submissions: {
					where: { deletedAt: null },
					select: {
						lhQty: true,
						qty: true,
						rhQty: true,
						materialReview: { select: { status: true } },
					},
				},
			},
		},
	}) satisfies Prisma.SalesOrdersSelect;

type WorkerCompletionRecord = Prisma.SalesOrdersGetPayload<{
	select: ReturnType<typeof selectWorkerCompletion>;
}>;

function isWorkerCompletionRecordCompleted(item: WorkerCompletionRecord) {
	const stats = composeSalesStatKeyValue(item.stat);
	const totalAssigned = sum(
		item.assignments.map(
			(assignment) =>
				assignment.qtyAssigned || sum([assignment.lhQty, assignment.rhQty]),
		),
	);
	const totalCompleted = sum(
		item.assignments.map((assignment) =>
			sum(
				assignment.submissions
					.filter(isFinalizedProductionSubmission)
					.map(
						(submission) =>
							submission.qty || sum([submission.lhQty, submission.rhQty]),
					),
			),
		),
	);

	return isProductionCompleted({
		productionStat: stats.prodCompleted,
		totalAssigned,
		totalCompleted,
		totalProductionQty: 0,
		assignmentCompleted:
			item.assignments.length > 0 &&
			item.assignments.every((assignment) => !!assignment.completedAt),
		useAssignmentCompletion: true,
	});
}

async function getProductionListAction(
	db: Db,
	query: SalesQueryParamsSchema & {
		workerId?: number | null;
		productionSort?: ProductionListSort | null;
		material?: string | null;
	},
	options: {
		includeMaterials?: boolean;
		workerCompletion?: "completed";
	} = {},
) {
	const where = whereSales(query) || {};
	const requestedTake =
		options.includeMaterials === false
			? Math.max(Number(query.size || 20), 1)
			: Math.min(Math.max(Number(query.size || 20), 1), 100);
	const boundedQuery = {
		...query,
		size: requestedTake,
	};

	const whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[] =
		[];
	if (Array.isArray(where?.AND)) {
		for (const condition of where.AND) {
			const assignmentWhere = condition.assignments?.some;
			if (assignmentWhere) whereAssignments.push(assignmentWhere);
		}
	} else if (where?.assignments?.some) {
		whereAssignments.push(where.assignments.some);
	}
	if (query.material || query.productionSort) {
		if (query.material && !query.productionSort) {
			return getMaterialFilteredProductionPage(
				db,
				query,
				where,
				whereAssignments,
				requestedTake,
			);
		}
		if (
			!query.material &&
			(query.productionSort === "newest" || query.productionSort === "oldest")
		) {
			return getDatabaseSortedProductionPage(
				db,
				query,
				where,
				whereAssignments,
				requestedTake,
				options,
			);
		}
		return getFilteredProductionPage(
			db,
			query,
			where,
			whereAssignments,
			requestedTake,
			options,
		);
	}
	if (options.workerCompletion) {
		return getDatabaseSortedProductionPage(
			db,
			{ ...query, productionSort: "newest" },
			where,
			whereAssignments,
			requestedTake,
			options,
		);
	}
	if (query.production === "pending") {
		return getDatabaseSortedProductionPage(
			db,
			{ ...query, productionSort: "newest" },
			where,
			whereAssignments,
			requestedTake,
			options,
		);
	}
	const { response, queryProps } = await composeQueryData(
		boundedQuery,
		where,
		db.salesOrders,
	);
	const data = await db.salesOrders.findMany({
		...queryProps,
		select: select(whereAssignments),
	});
	const materialState = await loadProductionMaterialSummaries(
		db,
		data.map((item) => item.id),
		options.includeMaterials !== false,
	);
	const rows = data.map((item) => ({
		...transformProductionList(item, {
			useAssignmentCompletion: !!query.workerId || !!query["production.status"],
		}),
		materials: materialState.unavailable
			? unavailableProductionMaterialSummary()
			: summarizeProductionMaterials(
					materialState.bySalesOrder.get(item.id) || [],
				),
	}));

	return response(rows.slice(0, requestedTake));
}

type ProductionSelectedRow = Prisma.SalesOrdersGetPayload<{
	select: ReturnType<typeof select>;
}>;

async function getDatabaseSortedProductionPage(
	db: Db,
	query: SalesQueryParamsSchema & {
		workerId?: number | null;
		productionSort?: ProductionListSort | null;
	},
	where: Prisma.SalesOrdersWhereInput,
	whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[],
	requestedTake: number,
	options: {
		includeMaterials?: boolean;
		workerCompletion?: "completed";
	},
) {
	let rawCursor = Math.max(Number(query.cursor || 0), 0);
	let nextCursor: string | null = null;
	let hasNextPage = false;
	const selected: ProductionSelectedRow[] = [];
	const direction = query.productionSort === "oldest" ? "asc" : "desc";
	const scanSize = 100;

	scan: while (!hasNextPage) {
		const records = await db.salesOrders.findMany({
			where,
			orderBy: [{ createdAt: direction }, { id: direction }],
			skip: rawCursor,
			take: scanSize,
			select: select(whereAssignments),
		});
		if (records.length === 0) break;
		for (const item of records) {
			rawCursor += 1;
			const completed = transformProductionList(item, {
				useAssignmentCompletion:
					!!query.workerId || !!query["production.status"],
			}).completed;
			if (query.production === "pending" && completed) {
				continue;
			}
			if (options.workerCompletion === "completed" && !completed) {
				continue;
			}
			if (selected.length === requestedTake) {
				hasNextPage = true;
				break scan;
			}
			selected.push(item);
			nextCursor = String(rawCursor);
		}
		if (records.length < scanSize) break;
	}

	const materialState = await loadProductionMaterialSummaries(
		db,
		selected.map((item) => item.id),
		options.includeMaterials !== false,
	);
	return {
		data: selected.map((item) =>
			attachMaterialSummary(item, query, materialState),
		),
		meta: {
			count: undefined,
			size: requestedTake,
			cursor: hasNextPage ? nextCursor : null,
		},
	};
}

async function getMaterialFilteredProductionPage(
	db: Db,
	query: SalesQueryParamsSchema & {
		workerId?: number | null;
		material?: string | null;
	},
	where: Prisma.SalesOrdersWhereInput,
	whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[],
	requestedTake: number,
) {
	let rawCursor = Math.max(Number(query.cursor || 0), 0);
	let nextCursor: string | null = null;
	let hasNextPage = false;
	const selectedRows: Array<ReturnType<typeof attachMaterialSummary>> = [];
	const scanSize = 100;

	scan: while (!hasNextPage) {
		const records = await db.salesOrders.findMany({
			where,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			skip: rawCursor,
			take: scanSize,
			select: select(whereAssignments),
		});
		if (records.length === 0) break;
		const materialState = await loadProductionMaterialSummaries(
			db,
			records.map((item) => item.id),
			true,
		);

		for (const item of records) {
			rawCursor += 1;
			if (
				query.production === "pending" &&
				transformProductionList(item, {
					useAssignmentCompletion:
						!!query.workerId || !!query["production.status"],
				}).completed
			) {
				continue;
			}
			const row = attachMaterialSummary(item, query, materialState);
			if (
				!query.material ||
				!matchesMaterialFilter(row.materials.state, query.material)
			) {
				continue;
			}
			if (selectedRows.length === requestedTake) {
				hasNextPage = true;
				break scan;
			}
			selectedRows.push(row);
			nextCursor = String(rawCursor);
		}
		if (records.length < scanSize) break;
	}

	return {
		data: selectedRows,
		meta: {
			count: undefined,
			size: requestedTake,
			cursor: hasNextPage ? nextCursor : null,
		},
	};
}

async function getFilteredProductionPage(
	db: Db,
	query: SalesQueryParamsSchema & {
		workerId?: number | null;
		productionSort?: ProductionListSort | null;
		material?: string | null;
	},
	where: Prisma.SalesOrdersWhereInput,
	whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[],
	requestedTake: number,
	options: { includeMaterials?: boolean },
) {
	const candidates = await db.salesOrders.findMany({
		where,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			priority: true,
			createdAt: true,
			assignments: {
				where: {
					deletedAt: null,
					AND: whereAssignments.length > 1 ? whereAssignments : undefined,
					...(whereAssignments.length === 1 ? whereAssignments[0] : {}),
				},
				select: { dueDate: true },
			},
		},
	});
	const orderedCandidates = query.productionSort
		? sortProductionListByPriority(
				candidates.map((candidate) => ({
					...candidate,
					dueDate: earliestDate(
						candidate.assignments.map((assignment) => assignment.dueDate),
					),
				})),
				query.productionSort,
			)
		: candidates;
	const requestedCursor = Math.max(Number(query.cursor || 0), 0);
	let candidateIndex = requestedCursor;
	const selectedRows: Array<ReturnType<typeof attachMaterialSummary>> = [];
	let nextCursor: string | null = null;
	let hasMatchingRowAfterPage = false;
	const scanSize = 100;

	while (
		candidateIndex < orderedCandidates.length &&
		!hasMatchingRowAfterPage
	) {
		const batch = orderedCandidates.slice(
			candidateIndex,
			candidateIndex + scanSize,
		);
		const records = await db.salesOrders.findMany({
			where: { id: { in: batch.map((item) => item.id) } },
			select: select(whereAssignments),
		});
		const recordsById = new Map(records.map((item) => [item.id, item]));
		const activeRecords = records.filter((item) => {
			if (query.production !== "pending") return true;
			return !transformProductionList(item, {
				useAssignmentCompletion:
					!!query.workerId || !!query["production.status"],
			}).completed;
		});
		const materialState = await loadProductionMaterialSummaries(
			db,
			activeRecords.map((item) => item.id),
			Boolean(query.material),
		);

		for (const candidate of batch) {
			candidateIndex += 1;
			const item = recordsById.get(candidate.id);
			if (!item) continue;
			if (
				query.production === "pending" &&
				transformProductionList(item, {
					useAssignmentCompletion:
						!!query.workerId || !!query["production.status"],
				}).completed
			) {
				continue;
			}
			const row = attachMaterialSummary(item, query, materialState);
			if (
				query.material &&
				!matchesMaterialFilter(row.materials.state, query.material)
			) {
				continue;
			}
			if (selectedRows.length === requestedTake) {
				hasMatchingRowAfterPage = true;
				break;
			}
			selectedRows.push(row);
			if (selectedRows.length === requestedTake) {
				nextCursor = String(candidateIndex);
			}
		}
	}

	if (!query.material && options.includeMaterials !== false) {
		const materialState = await loadProductionMaterialSummaries(
			db,
			selectedRows.map((item) => item.id),
			true,
		);
		for (const row of selectedRows) {
			row.materials = materialState.unavailable
				? unavailableProductionMaterialSummary()
				: summarizeProductionMaterials(
						materialState.bySalesOrder.get(row.id) || [],
					);
		}
	}

	return {
		data: selectedRows,
		meta: {
			count: undefined,
			size: requestedTake,
			cursor: hasMatchingRowAfterPage ? nextCursor : null,
		},
	};
}

function attachMaterialSummary(
	item: ProductionSelectedRow,
	query: SalesQueryParamsSchema & { workerId?: number | null },
	materialState: Awaited<ReturnType<typeof loadProductionMaterialSummaries>>,
) {
	return {
		...transformProductionList(item, {
			useAssignmentCompletion: !!query.workerId || !!query["production.status"],
		}),
		materials: materialState.unavailable
			? unavailableProductionMaterialSummary()
			: summarizeProductionMaterials(
					materialState.bySalesOrder.get(item.id) || [],
				),
	};
}

async function loadProductionMaterialSummaries(
	db: Db,
	salesOrderIds: number[],
	enabled: boolean,
) {
	const bySalesOrder = new Map<number, ProductionMaterialStatus[]>();
	if (!enabled || salesOrderIds.length === 0) {
		return { bySalesOrder, unavailable: false };
	}
	try {
		const productionPlan = await getSalesProductionPlan(db, {
			salesOrderIds,
			completeOrder: true,
		});
		for (const material of buildProductionMaterialStatuses(
			productionPlan.components,
		)) {
			if (material.salesOrderId == null) continue;
			const materials = bySalesOrder.get(material.salesOrderId) || [];
			materials.push(material);
			bySalesOrder.set(material.salesOrderId, materials);
		}
		return { bySalesOrder, unavailable: false };
	} catch {
		return { bySalesOrder, unavailable: true };
	}
}

function earliestDate(dates: Array<Date | null>) {
	return dates
		.filter((date): date is Date => date != null)
		.sort((left, right) => left.getTime() - right.getTime())[0];
}

function matchesMaterialFilter(state: string, filter: string) {
	if (filter === "available") return state === "ready";
	if (filter === "review") return state === "not_configured";
	if (filter === "blocked") return state === "pending";
	if (filter === "unavailable") return state === "unavailable";
	return true;
}

export function sortProductionListByPriority<
	T extends {
		id?: number | null;
		priority?: string | null;
		dueDate?: string | Date | null;
		createdAt?: string | Date | null;
	},
>(items: T[], sort: ProductionListSort | null = "priority") {
	const sortMode = sort || "priority";
	return [...items].sort((a, b) => {
		if (sortMode === "dueDateAsc") return compareDueDate(a, b);
		if (sortMode === "dueDateDesc") return compareDueDateDesc(a, b);
		if (sortMode === "newest") return compareCreatedAtDesc(a, b);
		if (sortMode === "oldest") return compareCreatedAt(a, b);

		const priorityRank =
			getSalesPriorityRank(a.priority) - getSalesPriorityRank(b.priority);
		if (priorityRank !== 0) return priorityRank;

		return compareDueDate(a, b);
	});
}

function compareDueDate<
	T extends {
		id?: number | null;
		priority?: string | null;
		dueDate?: string | Date | null;
		createdAt?: string | Date | null;
	},
>(a: T, b: T) {
	const dueDateRank = dateRank(a.dueDate) - dateRank(b.dueDate);
	if (dueDateRank !== 0) return dueDateRank;

	const priorityRank =
		getSalesPriorityRank(a.priority) - getSalesPriorityRank(b.priority);
	if (priorityRank !== 0) return priorityRank;

	return compareCreatedAt(a, b);
}

function compareDueDateDesc<
	T extends {
		id?: number | null;
		priority?: string | null;
		dueDate?: string | Date | null;
		createdAt?: string | Date | null;
	},
>(a: T, b: T) {
	const dueDateRank = compareDateDesc(a.dueDate, b.dueDate);
	if (dueDateRank !== 0) return dueDateRank;

	const priorityRank =
		getSalesPriorityRank(a.priority) - getSalesPriorityRank(b.priority);
	if (priorityRank !== 0) return priorityRank;

	return compareCreatedAt(a, b);
}

function compareCreatedAt<
	T extends { id?: number | null; createdAt?: string | Date | null },
>(a: T, b: T) {
	const createdAtRank = dateRank(a.createdAt) - dateRank(b.createdAt);
	if (createdAtRank !== 0) return createdAtRank;

	return Number(a.id || 0) - Number(b.id || 0);
}

function compareCreatedAtDesc<
	T extends { id?: number | null; createdAt?: string | Date | null },
>(a: T, b: T) {
	const createdAtRank = compareDateDesc(a.createdAt, b.createdAt);
	if (createdAtRank !== 0) return createdAtRank;

	return Number(b.id || 0) - Number(a.id || 0);
}

function dateRank(date?: string | Date | null) {
	return date ? new Date(date).getTime() : Number.MAX_SAFE_INTEGER;
}

function compareDateDesc(
	left?: string | Date | null,
	right?: string | Date | null,
) {
	if (!left && !right) return 0;
	if (!left) return 1;
	if (!right) return -1;
	return new Date(right).getTime() - new Date(left).getTime();
}

const select = (whereAssignments?) =>
	({
		customer: true,
		billingAddress: true,
		id: true,
		orderId: true,
		status: true,
		prodStatus: true,
		createdAt: true,
		priority: true,
		grandTotal: true,
		amountDue: true,
		salesRep: {
			select: { name: true },
		},
		stat: true,
		deliveries: {
			where: { deletedAt: null },
			select: {
				status: true,
				_count: { select: { items: true } },
			},
		},
		itemControls: {
			select: {
				qtyControls: true,
				assignments: {
					select: {
						id: true,
					},
				},
			},
		},
		assignments: {
			where: {
				deletedAt: null,
				AND: whereAssignments?.length > 1 ? whereAssignments : undefined,
				...(whereAssignments?.length === 1 ? whereAssignments[0] : {}),
			},
			select: {
				submissions: {
					where: {
						deletedAt: null,
					},
					select: {
						lhQty: true,
						qty: true,
						rhQty: true,
						materialReview: {
							select: {
								status: true,
							},
						},
					},
				},
				lhQty: true,
				rhQty: true,
				qtyAssigned: true,
				completedAt: true,
				dueDate: true,
				assignedTo: {
					select: {
						name: true,
					},
				},
			},
		},
	}) satisfies Prisma.SalesOrdersSelect;
function transformProductionList(
	item: Prisma.SalesOrdersGetPayload<{
		select: ReturnType<typeof select>;
	}>,
	options?: {
		useAssignmentCompletion?: boolean;
	},
	//RenturnTypeAsync<typeof getProductionListAction>[number]
) {
	// item.assignments;
	const dueDate = item.assignments.map((d) => d.dueDate).filter(Boolean);

	const alert = dueDateAlert(dueDate);

	const totalAssigned = sum(
		item.assignments.map((p) => p.qtyAssigned || sum([p.lhQty, p.rhQty])),
	);
	const stats = composeSalesStatKeyValue(item.stat);
	const status = overallStatus(item.stat);
	const lifecycleStatus = getSalesOrderLifecycleStatusInfo({
		orderStatus: item.status,
		legacyProductionStatus: item.prodStatus,
		productionStatus: status.production.status,
		fulfillmentStatus:
			resolveSalesInventoryFulfillmentStatus({
				deliveries: item.deliveries,
				stats: item.stat,
			}) ?? status.delivery.status,
	});

	const totalCompleted = sum(
		item.assignments.map((a) =>
			sum(
				a.submissions
					.filter(isFinalizedProductionSubmission)
					.map((s) => s.qty || sum([s.lhQty, s.rhQty])),
			),
		),
	);
	const totalProductionQty = sum(
		item.itemControls
			.filter((control) =>
				control.qtyControls.some((qty) => qty.type === "prodCompleted"),
			)
			.map((control) => {
				const productionQty = control.qtyControls.find(
					(qty) => qty.type === "prodCompleted",
				);
				const fallbackQty = control.qtyControls.find(
					(qty) => qty.type === "prodAssigned",
				);
				return productionQty?.itemTotal || fallbackQty?.itemTotal || 0;
			}),
	);
	const completed =
		hasCompletedProductionLifecycle(lifecycleStatus.status) ||
		isProductionCompleted({
			productionStat: stats.prodCompleted,
			totalAssigned,
			totalCompleted,
			totalProductionQty,
			assignmentCompleted:
				item.assignments.length > 0 &&
				item.assignments.every((assignment) => !!assignment.completedAt),
			useAssignmentCompletion: options?.useAssignmentCompletion,
		});
	const hasPendingReview = item.assignments.some((assignment) =>
		assignment.submissions.some(
			(submission) => submission.materialReview?.status === "PENDING",
		),
	);
	const workflowStatus = resolveProductionWorkflowStatus({
		assignment: status.assignment,
		production: status.production,
		hasPendingReview,
		completed,
	});
	// if (completed) alert.date = null;

	return {
		completed,
		totalAssigned,
		totalCompleted,
		dueDate: alert?.date || null,
		dueDateLabel: alert?.date ? formatDate(alert.date) : null,
		orderId: item.orderId,
		priority: normalizeSalesPriority(item.priority),
		priorityLabel: getSalesPriorityLabel(item.priority),
		alert,
		customer: item.customer?.name || item.customer?.businessName,
		invoice: {
			total: item.grandTotal == null ? null : Number(item.grandTotal),
			amountDue: item.amountDue == null ? null : Number(item.amountDue),
			status:
				item.amountDue == null
					? "unknown"
					: Number(item.amountDue) <= 0
						? "paid"
						: "outstanding",
		},

		salesRep: item?.salesRep?.name,
		assignedTo: Array.from(
			new Set(item.assignments.map((a) => a.assignedTo?.name)),
		)
			.filter((a) => !!a)
			.join(" & "),
		uuid: item.orderId,
		id: item.id,
		createdAt: item.createdAt,
		stats,
		status: {
			...status,
			production: {
				...status.production,
				workflow: workflowStatus,
			},
		},
		lifecycleStatus: lifecycleStatus.status,
	};
}

export function isProductionCompleted({
	productionStat,
	totalAssigned,
	totalCompleted,
	totalProductionQty,
	assignmentCompleted,
	useAssignmentCompletion,
}: {
	productionStat?: {
		total?: number | null;
		percentage?: number | null;
	} | null;
	totalAssigned: number;
	totalCompleted: number;
	totalProductionQty: number;
	assignmentCompleted?: boolean;
	useAssignmentCompletion?: boolean;
}) {
	const productionStatCompleted =
		Number(productionStat?.total || 0) > 0 &&
		Number(productionStat?.percentage || 0) === 100;
	const assignmentQtyCompleted =
		totalAssigned > 0 && totalCompleted >= totalAssigned;
	const productionQtyCompleted =
		totalProductionQty > 0 && totalCompleted >= totalProductionQty;

	return (
		productionStatCompleted ||
		(useAssignmentCompletion
			? assignmentQtyCompleted || !!assignmentCompleted
			: productionQtyCompleted)
	);
}

function filterCompletedProductions<
	T extends { completed?: boolean },
>(response: {
	data: T[];
	meta?: PageDataMeta;
	filter?: unknown;
	query?: unknown;
}) {
	const data = (response.data || []).filter((item) => !item.completed);
	return {
		...response,
		data,
	};
}
