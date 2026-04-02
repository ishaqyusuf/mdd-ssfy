import { Db, Prisma } from "@gnd/db";
import { SalesProductionQueryParams, SalesQueryParamsSchema } from "./schema";
import { whereSales } from "./utils/where-queries";
import { composeQueryData, PageDataMeta } from "@gnd/utils/query-response";
import { sum } from "@gnd/utils";
import dayjs, { formatDate } from "@gnd/utils/dayjs";
import {
	composeSalesStatKeyValue,
	dueDateAlert,
	overallStatus,
} from "./utils/utils";

export async function getSalesProductions(
	db: Db,
	query: SalesProductionQueryParams,
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
				size: 99,
			}),
		);
	const getPastDue = async () =>
		filterCompletedProductions(
			await getProductionListAction(db, {
				salesType: "order",
				"production.assignedToId": assignedToId,
				"production.status": "past due",
				size: 99,
			}),
		);
	const getDueTomorrow = async () =>
		filterCompletedProductions(
			await getProductionListAction(db, {
				salesType: "order",
				"production.assignedToId": assignedToId,
				"production.status": "due tomorrow",
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
	query: SalesProductionQueryParams,
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

async function getProductionListAction(db: Db, query: SalesQueryParamsSchema) {
	const where = whereSales(query);

	const whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[] = (
		Array.isArray(where?.AND)
			? where.AND?.map((a) => a.assignments?.some).filter(Boolean)
			: where?.assignments
				? [where?.assignments]
				: []
	) as any;
	const { response, queryProps } = await composeQueryData(
		query,
		where,
		db.salesOrders,
	);
	const data = await db.salesOrders.findMany({
		...queryProps,
		select: select(whereAssignments),
	});
	return response(
		data.map((item) =>
			transformProductionList(item, {
				useAssignmentCompletion: !!query.workerId,
			}),
		),
	);
}
const select = (whereAssignments?) =>
	({
		customer: true,
		billingAddress: true,
		id: true,
		orderId: true,
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
				...(whereAssignments?.length == 1 ? whereAssignments[0] : {}),
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
	const completed = options?.useAssignmentCompletion
		? totalAssigned === totalCompleted
		: totalProductionQty > 0 && totalCompleted >= totalProductionQty;
	// if (completed) alert.date = null;

	return {
		completed,
		totalAssigned,
		totalCompleted,
		dueDate: alert?.date || null,
		dueDateLabel: alert?.date ? formatDate(alert.date) : null,
		orderId: item.orderId,
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
		stats,
		status: overallStatus(item.stat),
	};
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
