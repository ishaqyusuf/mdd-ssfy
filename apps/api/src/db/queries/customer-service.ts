import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import type { id } from "date-fns/locale";
import { z } from "zod";
import type { TRPCContext } from "../../trpc/init";

export const getCustomerServicesSchema = z
	.object({
		q: z.string().nullish(),
		dateRange: z.union([z.string(), z.array(z.string())]).nullish(),
		scheduleDate: z.union([z.string(), z.array(z.string())]).nullish(),
		techId: z
			.union([z.number(), z.array(z.number())])
			.optional()
			.nullable(),
		status: z
			.union([z.string(), z.array(z.string())])
			.optional()
			.nullable(),
		// Add other filter properties here
	})
	.extend(paginationSchema.shape);

export type GetCustomerServicesSchema = z.infer<
	typeof getCustomerServicesSchema
>;

export async function getCustomerServices(
	ctx: TRPCContext,
	query: GetCustomerServicesSchema,
) {
	const { db } = ctx;
	const model = db.workOrders;

	const { response, searchMeta } = await composeQueryData(
		query,
		whereCustomerServices(query),
		model,
	);

	const data = await model.findMany({
		where: whereCustomerServices(query),
		...searchMeta,
		select: {
			id: true,
			slug: true,
			description: true,
			lot: true,
			block: true,
			projectName: true,
			builderName: true,
			requestDate: true,
			scheduleDate: true,
			scheduleTime: true,
			homeAddress: true,
			homeOwner: true,
			homePhone: true,
			status: true,
			techId: true,
			createdAt: true,
			tech: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	return await response(
		data.map((item) => {
			return {
				...item,
			};
		}),
	);
}

export async function getCustomerServicesCount(
	ctx: TRPCContext,
	query: GetCustomerServicesSchema,
) {
	return ctx.db.workOrders.count({
		where: whereCustomerServices(query),
	});
}

export function whereCustomerServices(query: GetCustomerServicesSchema) {
	const where: Prisma.WorkOrdersWhereInput[] = [];
	for (const [k, v] of Object.entries(query)) {
		if (!v) continue;

		switch (k as keyof GetCustomerServicesSchema) {
			case "q":
				where.push({
					OR: [
						{ description: { contains: v as any } },
						{ homeOwner: { contains: v as any } },
						{ projectName: { contains: v as any } },
						{ homePhone: { contains: v as any } },
					],
				});
				break;
			case "dateRange":
				where.push({
					createdAt: transformFilterDateToQuery(query.dateRange),
				});
				break;
			case "scheduleDate":
				where.push({
					scheduleDate: transformFilterDateToQuery(query.scheduleDate),
				});
				break;
			case "techId":
				where.push({
					techId: Array.isArray(v) ? { in: v as number[] } : (v as number),
				});
				break;
			case "status":
				where.push({
					status: Array.isArray(v) ? { in: v as string[] } : (v as string),
				});
				break;
		}
	}
	return composeQuery(where);
}

export async function getWorkOrderAssignees(ctx: TRPCContext) {
	return ctx.db.users.findMany({
		where: {
			OR: [
				{ deletedAt: null, accessRevokedAt: null, roles: { some: { role: { name: "Punchout" } } } },
				{ workOrders: { some: { deletedAt: null } } },
			],
		},
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});
}

export async function getCustomerServiceSummary(ctx: TRPCContext) {
	const groups = await ctx.db.workOrders.groupBy({
		by: ["status"],
		where: { deletedAt: null },
		_count: { _all: true },
	});
	const counts = Object.fromEntries(
		groups.map((group) => [group.status ?? "Unspecified", group._count._all]),
	);
	return {
		total: groups.reduce((sum, group) => sum + group._count._all, 0),
		pending: counts.Pending ?? 0,
		scheduled: counts.Scheduled ?? 0,
		incomplete: counts.Incomplete ?? 0,
		completed: counts.Completed ?? 0,
	};
}

export const getCustomerServiceCalendarSchema = z.object({
	from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function getCustomerServiceCalendar(
	ctx: TRPCContext,
	{ from, to }: z.infer<typeof getCustomerServiceCalendarSchema>,
) {
	const start = new Date(`${from}T00:00:00.000Z`);
	const end = new Date(`${to}T23:59:59.999Z`);
	if (
		Number.isNaN(start.getTime()) ||
		Number.isNaN(end.getTime()) ||
		end.getTime() - start.getTime() > 45 * 86_400_000
	) {
		throw new Error("Choose a calendar range of 45 days or less");
	}
	return ctx.db.workOrders.findMany({
		where: { deletedAt: null, scheduleDate: { gte: start, lte: end } },
		select: {
			id: true,
			scheduleDate: true,
			scheduleTime: true,
			homeOwner: true,
			projectName: true,
			description: true,
			status: true,
			tech: { select: { name: true } },
		},
		orderBy: [{ scheduleDate: "asc" }, { id: "asc" }],
		take: 500,
	});
}

export const assignWorkOrderSchema = z.object({
	userId: z.number(),
	woId: z.number(),
});
export type AssignWorkOrderSchema = z.infer<typeof assignWorkOrderSchema>;

export async function assignWorkOrder(
	ctx: TRPCContext,
	data: AssignWorkOrderSchema,
) {
	const { db } = ctx;
	await db.workOrders.update({
		where: {
			id: data.woId,
		},
		data: {
			tech: {
				connect: {
					id: data.userId,
				},
			},
		},
	});
}

export const deleteWorkOrderSchema = z.object({
	id: z.number(),
});
export type DeleteWorkOrderSchema = z.infer<typeof deleteWorkOrderSchema>;

export async function deleteWorkOrder(
	ctx: TRPCContext,
	query: DeleteWorkOrderSchema,
) {
	const { db } = ctx;
	await db.workOrders.update({
		where: { id: query.id },
		data: {
			deletedAt: new Date(),
		},
	});
}

export const updateWorkOrderStatusSchema = z.object({
	status: z.string(),
	id: z.number(),
});
export type UpdateWorkOrderStatusSchema = z.infer<
	typeof updateWorkOrderStatusSchema
>;

export async function updateWorkOrderStatus(
	ctx: TRPCContext,
	query: UpdateWorkOrderStatusSchema,
) {
	const { db } = ctx;
	await db.workOrders.update({
		where: { id: query.id },
		data: {
			status: query.status,
		},
	});
}

/*
workOrderAnalytic: publicProcedure
      .input(workOrderAnalyticSchema)
      .query(async (props) => {
        return workOrderAnalytic(props.ctx, props.input);
      }),
*/

/*
getWorkorderChartFilter: publicProcedure
      .input(getWorkorderChartFilterSchema)
      .query(async (props) => {
        return getWorkorderChartFilter(props.ctx, props.input);
      }),
*/
export const getWorkorderChartFilterSchema = z.object({
	// date: z.string(),
});
export type GetWorkorderChartFilterSchema = z.infer<
	typeof getWorkorderChartFilterSchema
>;

export async function getWorkorderChartFilter(
	ctx: TRPCContext,
	query: GetWorkorderChartFilterSchema,
) {
	const { db } = ctx;
	const model = db.workOrders;

	const sixtyDaysAgo = new Date();
	sixtyDaysAgo.setHours(0, 0, 0, 0);
	sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 59); // 60 days including today

	const workOrders = await model.findMany({
		where: {
			createdAt: {
				gte: sixtyDaysAgo,
			},
			deletedAt: null,
		},
		select: {
			createdAt: true,
		},
	});

	const dailyCounts = new Map<string, number>();
	workOrders.forEach((wo) => {
		const dateKey = wo.createdAt?.toISOString().split("T")[0]; // YYYY-MM-DD
		dailyCounts.set(dateKey!, (dailyCounts.get(dateKey!) || 0) + 1);
	});

	const chartData: { date; total }[] = [];
	for (let i = 59; i >= 0; i--) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		date.setHours(0, 0, 0, 0);

		const dateKey = date.toISOString().split("T")[0];
		const month = date
			.toLocaleString("default", { month: "short" })
			.toUpperCase();
		const day = date.getDate();

		chartData.push({
			date: i === 0 ? "TODAY" : `${month} ${day}`,
			total: dailyCounts.get(dateKey!) || 0,
		});
	}

	return chartData;
}
