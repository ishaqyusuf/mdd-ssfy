import { whereSales } from "@api/prisma-where";
import { paginationSchema } from "@api/schemas/common";
import type { TRPCContext } from "@api/trpc/init";
import type { PageDataMeta } from "@api/type";
import { dateEquals } from "@api/utils/db";
import {
	classifyOrderPaymentConflict,
	projectLegacyOrderPayments,
} from "@gnd/sales";
import { filterIsDefault, formatMoney, sum } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import { composeQueryData } from "@gnd/utils/query-response";
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

export async function getSalesResolutions(
	ctx: TRPCContext,
	query: GetSalesResolutions,
) {
	const { db } = ctx;
	const resolvables = await getSalesResolvables(ctx, {
		salesNo: query.salesNo,
		"customer.name": query["customer.name"],
	});
	const { q, size = 20, status, cursor = "0" } = query;
	const meta: PageDataMeta = {};

	let filteredResolvables = [...resolvables];
	switch (status) {
		case "Resolved":
			filteredResolvables = filteredResolvables?.filter(
				(a) => a.status === "resolved",
			);
			break;
		case "Resolved Today":
			break;
		case "Unresolved":
			break;
	}
	// if (q) {
	//   const s = q?.toLocaleLowerCase();
	//   filteredResolvables = filteredResolvables.filter((a) => {
	//     const searchFields = [
	//       a.orderId,
	//       a?.customer?.name,
	//       a?.customer?.businessName,
	//       a?.salesRep,
	//       a?.accountNo,
	//     ]
	//       .filter(Boolean)
	//       .map((field) => field!.toString().toLocaleLowerCase());

	//     // Split search into words and require all to match (AND search)
	//     const searchWords = s.split(/\s+/).filter(Boolean);

	//     return searchWords.every((word) => {
	//       try {
	//         const regex = new RegExp(word, "i");
	//         return searchFields.some((field) => regex.test(field));
	//       } catch {
	//         // fallback to simple includes if regex fails
	//         return searchFields.some((field) => field.includes(word));
	//       }
	//     });
	//   });
	// }
	meta.count = filteredResolvables
		.filter((a) => a.status)
		.filter((a) => a.status !== "resolved").length;
	const _cursor = Number(cursor) || 0;
	const nextCursor = _cursor + size;
	//   if (data.length > size!) cursor = size + start;
	meta.cursor = nextCursor < meta.count ? String(nextCursor) : null;
	meta.hasNextPage = nextCursor > 0;
	return {
		data: filteredResolvables
			.filter((a, i) => i >= _cursor)
			.filter((a, i) => i < size),
		meta,
	};
}
export async function getSalesResolvables(
	ctx: TRPCContext,
	query: SalesQueryParamsSchema,
) {
	const { db: prisma } = ctx;

	const resolvedToday = await prisma.salesResolution.findMany({
		where: {
			createdAt: dateEquals(new Date()),
		},
		select: {
			id: true,
			salesId: true,
			createdAt: true,
		},
	});
	const _whereSales = whereSales(query);
	const isDefaultFilter = filterIsDefault(query);

	const list = await prisma.salesOrders.findMany({
		where: {
			type: "order" as SalesType,
			payments: {
				some: {
					deletedAt: null,
					// status: {
					//     in: ["success"] as SalesPaymentStatus[],
					// },
				},
			},
			..._whereSales,
		},
		select: {
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
					id: true,
				},
			},
			payments: {
				where: {
					deletedAt: null,
					// status: {
					//     in: ["success"] as SalesPaymentStatus[],
					// },
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
		},
	});
	return list
		.map((ls) => {
			const { salesRep, orderId, customer } = ls;
			const successfulPayments = ls.payments.filter(
				(a) => a.status === "success",
			);
			const paid = formatMoney(sum(successfulPayments, "amount"));
			const date = ls.payments[0]?.createdAt;
			const total = ls.grandTotal;
			const due = formatMoney(ls.amountDue);
			const projection = projectLegacyOrderPayments({
				salesOrderId: ls.id,
				grandTotal: total,
				payments: ls.payments,
			});
			const calculatedDue = projection.amountDue;

			let status: SalesResolutionConflictType = classifyOrderPaymentConflict({
				paidAmount: paid,
				storedAmountDue: due,
				calculatedAmountDue: calculatedDue,
				paymentAmounts: successfulPayments.map((payment) => payment.amount),
			}).status as SalesResolutionConflictType;
			const rData = resolvedToday?.find((a) => a.salesId === ls.id);
			if (rData) {
				status = "resolved";
			}
			if (!isDefaultFilter && !status) status = "no conflict";
			return {
				id: ls.id,
				customer,
				paid,
				date,
				total,
				due,
				status,
				calculatedDue,
				paymentCount: payments.length,
				salesRep: salesRep?.name,
				orderDate: formatDate(ls.createdAt),
				orderId,
				accountNo: ls.customer?.phoneNo,
				resolvedAt: rData?.createdAt,
			};
		})
		.filter(
			!isDefaultFilter
				? Boolean
				: (a) => a.status || !!resolvedToday?.find((b) => b.salesId === a.id),
		)
		.sort(
			(a, b) =>
				new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
		);
}
