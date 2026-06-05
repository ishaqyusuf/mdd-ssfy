import type { Db, Prisma } from "@gnd/db";
import { sum } from "@gnd/utils";
import dayjs, { formatDate } from "@gnd/utils/dayjs";
import { type PageDataMeta, composeQueryData } from "@gnd/utils/query-response";
import {
	getSalesPriorityLabel,
	getSalesPriorityRank,
	normalizeSalesPriority,
} from "./priority";
import type {
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
};

export async function getSalesProductions(
	db: Db,
	query: SalesProductionListQuery,
) {
	const assignedToId = query.workerId || query.assignedToId;
	const normalizedQuery = {
		...query,
		"production.assignedToId":
			query["production.assignedToId"] || assignedToId || undefined,
	};
	const getDueToday = async () =>
		filterCompletedProductions(
			await getProductionListAction(db, {
				salesType: "order",
				"production.assignedToId": assignedToId,
				"production.status": "due today",
				"sales.priority": query.priority || query["sales.priority"],
				productionSort: query.productionSort,
				size: 99,
			}),
		);
	const getPastDue = async () =>
		filterCompletedProductions(
			await getProductionListAction(db, {
				salesType: "order",
				"production.assignedToId": assignedToId,
				"production.status": "past due",
				"sales.priority": query.priority || query["sales.priority"],
				productionSort: query.productionSort,
				size: 99,
			}),
		);
	const getDueTomorrow = async () =>
		filterCompletedProductions(
			await getProductionListAction(db, {
				salesType: "order",
				"production.assignedToId": assignedToId,
				"production.status": "due tomorrow",
				"sales.priority": query.priority || query["sales.priority"],
				productionSort: query.productionSort,
				size: 99,
			}),
		);
	switch (query.show) {
		case "due-today":
			return await getDueToday();
		case "due-tomorrow":
			return await getDueTomorrow();
		case "past-due":
			return await getPastDue();
	}
	const response = await getProductionListAction(db, {
		...normalizedQuery,
		"sales.priority": query.priority || query["sales.priority"],
		salesType: "order",
		//   "production.status": "part assigned",
	});
	return query.production === "pending"
		? filterCompletedProductions(response)
		: response;
	//   const others = prodList.filter((p) => !excludesIds?.includes(p.id));
}

export async function getSalesProductionDashboard(
	db: Db,
	query: SalesProductionListQuery,
) {
	const assignedToId = query.workerId || query.assignedToId;
	const baseQuery: SalesProductionQueryParams = {
		...query,
		assignedToId,
		workerId: query.workerId,
		production: "pending",
		size: 500,
	};

	const [queueResponse, dueToday, dueTomorrow, pastDue] = await Promise.all([
		getProductionListAction(db, {
			...baseQuery,
			"production.assignedToId":
				query["production.assignedToId"] || assignedToId || undefined,
			"sales.priority": query.priority || query["sales.priority"],
			salesType: "order",
		} as SalesQueryParamsSchema),
		getSalesProductions(db, { ...baseQuery, show: "due-today" }),
		getSalesProductions(db, { ...baseQuery, show: "due-tomorrow" }),
		getSalesProductions(db, { ...baseQuery, show: "past-due" }),
	]);

	const queue = filterCompletedProductions(queueResponse);
	const queueData = queue.data || [];
	const calendarMap = new Map<
		string,
		{
			date: string;
			label: string;
			shortLabel: string;
			count: number;
			isToday: boolean;
			isTomorrow: boolean;
		}
	>();

	for (let index = 0; index < 10; index++) {
		const currentDate = dayjs().add(index, "day");
		const key = currentDate.format("YYYY-MM-DD");
		calendarMap.set(key, {
			date: key,
			label: currentDate.format("ddd, MMM D"),
			shortLabel: currentDate.format("ddd"),
			count: 0,
			isToday: index === 0,
			isTomorrow: index === 1,
		});
	}

	for (const item of queueData) {
		if (!item.dueDate) continue;
		const key = dayjs(item.dueDate).format("YYYY-MM-DD");
		const current = calendarMap.get(key);
		if (!current) continue;
		current.count += 1;
	}

	return {
		summary: {
			queueCount: queueData.length,
			dueTodayCount: dueToday.data.length,
			dueTomorrowCount: dueTomorrow.data.length,
			pastDueCount: pastDue.data.length,
		},
		alerts: {
			pastDue: pastDue.data.slice(0, 8),
			dueToday: dueToday.data.slice(0, 8),
			dueTomorrow: dueTomorrow.data.slice(0, 8),
		},
		calendar: Array.from(calendarMap.values()),
		spotlight: queueData.slice(0, 6),
	};
}

async function getProductionListAction(
	db: Db,
	query: SalesQueryParamsSchema & {
		workerId?: number | null;
		productionSort?: ProductionListSort | null;
	},
) {
	const where = whereSales(query);

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
	const { response, queryProps } = await composeQueryData(
		query,
		where,
		db.salesOrders,
	);
	const requestedTake = Number(query.size || 20);
	const start = Number(query.cursor || 0);
	const shouldSortBeforePagination = !!query.productionSort;
	const listQueryProps = shouldSortBeforePagination
		? { ...queryProps, skip: undefined, take: undefined }
		: queryProps;
	const data = await db.salesOrders.findMany({
		...listQueryProps,
		select: select(whereAssignments),
	});
	const sorted = sortProductionListByPriority(
		data.map((item) =>
			transformProductionList(item, {
				useAssignmentCompletion:
					!!query.workerId || !!query["production.status"],
			}),
		),
		query.productionSort,
	);

	return response(
		sorted.slice(
			shouldSortBeforePagination ? start : 0,
			(shouldSortBeforePagination ? start : 0) + requestedTake,
		),
	);
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
		createdAt: true,
		priority: true,
		salesRep: {
			select: { name: true },
		},
		stat: true,
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

	const totalCompleted = sum(
		item.assignments.map((a) =>
			sum(a.submissions.map((s) => s.qty || sum([s.lhQty, s.rhQty]))),
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
	const completed = isProductionCompleted({
		productionStat: stats.prodCompleted,
		totalAssigned,
		totalCompleted,
		totalProductionQty,
		assignmentCompleted:
			item.assignments.length > 0 &&
			item.assignments.every((assignment) => !!assignment.completedAt),
		useAssignmentCompletion: options?.useAssignmentCompletion,
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
		status: overallStatus(item.stat),
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
		meta: {
			...response.meta,
			count: data.length,
		},
	};
}
