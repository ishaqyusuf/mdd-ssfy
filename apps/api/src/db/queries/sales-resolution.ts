import { whereSales } from "@api/prisma-where";
import { paginationSchema } from "@api/schemas/common";
import type { TRPCContext } from "@api/trpc/init";
import type { PageDataMeta } from "@api/type";
import { dateEquals } from "@api/utils/db";
import type { Prisma } from "@gnd/db";
import {
	classifyOrderPaymentConflict,
	projectLegacyOrderPayments,
} from "@gnd/sales";
import { filterIsDefault, formatMoney, sum } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import type { SalesResolutionConflictType } from "@sales/constants";
import type { SalesQueryParamsSchema } from "@sales/schema";
import type { SalesType } from "@sales/types";
import { z } from "zod";

export const getSalesResolutionsSchema = z
	.object({
		status: z.string().optional().nullable(),
		salesNo: z.string().optional().nullable(),
		"customer.name": z.string().optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type GetSalesResolutions = z.infer<typeof getSalesResolutionsSchema>;

const resolutionOrderSelect = {
	id: true,
	grandTotal: true,
	createdAt: true,
	amountDue: true,
	orderId: true,
	customer: {
		select: {
			name: true,
			businessName: true,
			phoneNo: true,
		},
	},
	salesRep: {
		select: {
			name: true,
		},
	},
	payments: {
		where: {
			deletedAt: null,
		},
		select: {
			amount: true,
			status: true,
			createdAt: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	},
} satisfies Prisma.SalesOrdersSelect;

type ResolutionOrder = Prisma.SalesOrdersGetPayload<{
	select: typeof resolutionOrderSelect;
}>;

type ResolutionItem = {
	id: number;
	customer: ResolutionOrder["customer"];
	paid: number;
	date: Date | null | undefined;
	total: number;
	due: number;
	status: SalesResolutionConflictType | "resolved" | "no conflict" | "";
	calculatedDue: number;
	paymentCount: number;
	salesRep: string | null | undefined;
	orderDate: string;
	orderId: string;
	accountNo: string | null | undefined;
	resolvedAt: Date | null | undefined;
};

function buildResolutionBaseWhere(query: GetSalesResolutions) {
	const salesWhere = whereSales({
		q: query.q,
		salesNo: query.salesNo,
	} as SalesQueryParamsSchema);
	const customerName = query["customer.name"]?.trim();

	return {
		type: "order" as SalesType,
		payments: {
			some: {
				deletedAt: null,
			},
		},
		...(salesWhere ?? {}),
		...(customerName
			? {
					customer: {
						OR: [
							{
								name: {
									contains: customerName,
								},
							},
							{
								businessName: {
									contains: customerName,
								},
							},
						],
					},
				}
			: {}),
	} satisfies Prisma.SalesOrdersWhereInput;
}

async function getResolvedTodayMap(ctx: TRPCContext) {
	const rows = await ctx.db.salesResolution.findMany({
		where: {
			createdAt: dateEquals(new Date()),
		},
		select: {
			salesId: true,
			createdAt: true,
		},
	});

	return new Map(rows.map((row) => [row.salesId, row.createdAt]));
}

function mapResolutionItem(args: {
	order: ResolutionOrder;
	isDefaultFilter: boolean;
	resolvedTodayMap: Map<number, Date>;
}): ResolutionItem | null {
	const { order, isDefaultFilter, resolvedTodayMap } = args;
	const successfulPayments = order.payments.filter(
		(payment) => payment.status === "success",
	);
	const paid = formatMoney(sum(successfulPayments, "amount"));
	const date = order.payments[0]?.createdAt;
	const total = order.grandTotal;
	const due = formatMoney(order.amountDue);
	const projection = projectLegacyOrderPayments({
		salesOrderId: order.id,
		grandTotal: total,
		payments: order.payments,
	});
	const calculatedDue = projection.amountDue;

	let status = classifyOrderPaymentConflict({
		paidAmount: paid,
		storedAmountDue: due,
		calculatedAmountDue: calculatedDue,
		paymentAmounts: successfulPayments.map((payment) => payment.amount),
	}).status as SalesResolutionConflictType | "";

	const resolvedAt = resolvedTodayMap.get(order.id);
	if (resolvedAt) {
		status = "resolved";
	}

	if (!isDefaultFilter && !status) {
		status = "no conflict";
	}

	if (isDefaultFilter && !status) {
		return null;
	}

	return {
		id: order.id,
		customer: order.customer,
		paid,
		date,
		total,
		due,
		status,
		calculatedDue,
		paymentCount: order.payments.length,
		salesRep: order.salesRep?.name,
		orderDate: formatDate(order.createdAt),
		orderId: order.orderId,
		accountNo: order.customer?.phoneNo,
		resolvedAt,
	};
}

function matchesResolutionStatus(
	item: ResolutionItem,
	status: GetSalesResolutions["status"],
) {
	switch (status) {
		case "Resolved":
		case "Resolved Today":
			return item.status === "resolved";
		case "Unresolved":
			return !!item.status && item.status !== "resolved";
		default:
			return true;
	}
}

export async function getSalesResolutions(
	ctx: TRPCContext,
	query: GetSalesResolutions,
) {
	const { db } = ctx;
	const size = Math.max(1, query.size || 20);
	const chunkSize = Math.max(size * 3, 60);
	const startingCursor = Number(query.cursor) || 0;
	const isDefaultFilter = filterIsDefault(query);
	const resolvedTodayMap = await getResolvedTodayMap(ctx);
	const where = buildResolutionBaseWhere(query);

	const data: ResolutionItem[] = [];
	let nextOffset = startingCursor;
	let hasMoreCandidates = true;

	while (data.length < size && hasMoreCandidates) {
		const orders = await db.salesOrders.findMany({
			where,
			select: resolutionOrderSelect,
			orderBy: {
				createdAt: "desc",
			},
			skip: nextOffset,
			take: chunkSize,
		});

		nextOffset += orders.length;
		hasMoreCandidates = orders.length === chunkSize;

		for (const order of orders) {
			const item = mapResolutionItem({
				order,
				isDefaultFilter,
				resolvedTodayMap,
			});

			if (!item || !matchesResolutionStatus(item, query.status)) {
				continue;
			}

			data.push(item);
			if (data.length >= size) {
				break;
			}
		}
	}

	const meta: PageDataMeta = {
		size,
		count: data.length,
		cursor: hasMoreCandidates ? String(nextOffset) : null,
		hasNextPage: hasMoreCandidates,
	};

	return {
		data,
		meta,
	};
}

export async function getSalesResolutionsSummary(
	ctx: TRPCContext,
	query: GetSalesResolutions,
) {
	const { db } = ctx;
	const isDefaultFilter = filterIsDefault(query);
	const resolvedTodayMap = await getResolvedTodayMap(ctx);
	const orders = await db.salesOrders.findMany({
		where: buildResolutionBaseWhere(query),
		select: resolutionOrderSelect,
	});

	return orders.reduce(
		(acc, order) => {
			const item = mapResolutionItem({
				order,
				isDefaultFilter,
				resolvedTodayMap,
			});

			if (!item) {
				return acc;
			}

			acc.totalCount += 1;
			if (item.status === "resolved") {
				acc.resolvedCount += 1;
				return acc;
			}

			if (!item.status || item.status === "no conflict") {
				return acc;
			}

			acc.unresolvedCount += 1;
			switch (item.status) {
				case "overpayment":
					acc.overpaymentCount += 1;
					break;
				case "duplicate payments":
					acc.duplicatePaymentsCount += 1;
					break;
				case "payment not up to date":
					acc.paymentNotUpToDateCount += 1;
					break;
			}

			return acc;
		},
		{
			totalCount: 0,
			unresolvedCount: 0,
			resolvedCount: 0,
			overpaymentCount: 0,
			duplicatePaymentsCount: 0,
			paymentNotUpToDateCount: 0,
		},
	);
}
