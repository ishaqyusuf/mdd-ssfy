import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { formatMoney, sum, transformFilterDateToQuery } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import type { HousePackageToolMeta } from "@sales/types";

import { z } from "zod";

/*
salesStatistics: publicProcedure
      .input(salesStatisticschema)
      .query(async (props) => {
        return salesStatistics(props.ctx.db, props.input);
      }),
*/
export const productReportSchema = z
	.object({
		q: z.string().optional().nullable(),
		productId: z.number().optional().nullable(),
		dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
		reportCategory: z.string().optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type ProductReportSchema = z.infer<typeof productReportSchema>;

type ProductReportDateRange = ProductReportSchema["dateRange"];
type MouldingPriceMeta = HousePackageToolMeta["priceTags"] extends infer T
	? T extends { moulding?: infer M }
		? M & { overridPrice?: number | null }
		: never
	: never;

function getProductReportDateWhere(query: ProductReportSchema) {
	const createdAt = transformFilterDateToQuery(
		query.dateRange as ProductReportDateRange,
	);

	return createdAt ? { createdAt } : {};
}

function getOrderWhere() {
	return {
		deletedAt: null,
		type: "order" as const,
	};
}

function getOrderItemWhere() {
	return {
		deletedAt: null,
		salesOrder: getOrderWhere(),
	};
}

function getStepFormSalesWhere(query: ProductReportSchema) {
	return {
		deletedAt: null,
		price: { gt: 0 },
		basePrice: { gt: 0 },
		...getProductReportDateWhere(query),
		salesOrderItem: getOrderItemWhere(),
	} satisfies Prisma.DykeStepFormWhereInput;
}

function getSalesDoorWhere(query: ProductReportSchema) {
	return {
		deletedAt: null,
		...getProductReportDateWhere(query),
		order: getOrderWhere(),
		salesOrderItem: getOrderItemWhere(),
	} satisfies Prisma.DykeSalesDoorsWhereInput;
}

function getHousePackageToolWhere(query: ProductReportSchema) {
	return {
		deletedAt: null,
		moldingId: { not: null },
		...getProductReportDateWhere(query),
		order: getOrderWhere(),
		salesOrderItem: getOrderItemWhere(),
	} satisfies Prisma.HousePackageToolsWhereInput;
}

function isProductReportComponentEnabled(component: {
	custom?: boolean | null;
	meta?: unknown;
}) {
	if (!component.custom) return true;
	if (
		!component.meta ||
		typeof component.meta !== "object" ||
		Array.isArray(component.meta)
	) {
		return true;
	}

	const deletedAt = (component.meta as Record<string, unknown>).deletedAt;
	return typeof deletedAt !== "string" || deletedAt.length === 0;
}

export async function getProductReport(
	{ db }: TRPCContext,
	query: ProductReportSchema,
) {
	const { response, where } = await composeQueryData(
		query,
		whereStat(query),
		db.dykeStepProducts,
	);
	const stepFormSalesWhere = getStepFormSalesWhere(query);
	const salesDoorWhere = getSalesDoorWhere(query);
	const housePackageToolWhere = getHousePackageToolWhere(query);

	const data = await db.dykeStepProducts.findMany({
		where,
		// where: {
		//   step: {
		//     title: {
		//       contains: query.reportCategory,
		//     },
		//   },
		// },
		orderBy: {
			id: "asc",
		},
		// include: SalesListInclude,
		// orderBy: {
		//   updatedAt: "desc",
		// },
		select: {
			createdAt: true,
			img: true,
			id: true,
			custom: true,
			meta: true,
			name: true,

			step: {
				select: {
					title: true,
				},
			},
			product: { select: { title: true, productCode: true, img: true } },
			stepForms: {
				where: stepFormSalesWhere,
				select: {
					price: true,
					basePrice: true,
				},
			},
			housePackageTools: {
				where: housePackageToolWhere,
				select: {
					// molding: {
					//   select: {
					//     qty: true,
					//     price: true,
					//   },
					// },

					meta: true,
					salesOrderItem: {
						select: {
							qty: true,
						},
					},
				},
			},
			salesDoors: {
				select: {
					totalQty: true,
					jambSizePrice: true,
				},
				where: salesDoorWhere,
			},
			_count: {
				select: {
					// salesDoors: {
					//   where: {
					//     deletedAt: null,
					//   }
					// },
					stepForms: { where: stepFormSalesWhere },
				},
			},
		},
	});
	const pageSize = query.size ? Number(query.size) : 20;
	const cursor = Number(query.cursor || 0);
	const rows = data
		.filter(isProductReportComponentEnabled)
		.map((d) => {
			const productCode = d.product?.productCode;
			const isMolding =
				// ?.filter((a) => a?.molding)
				!!d?.housePackageTools?.length;
			const doorsCount = d?.salesDoors?.length;
			const salesCount =
				doorsCount + d.housePackageTools.length + d.stepForms.length;
			const hpts = d.housePackageTools
				.map((a) => ({
					...a,
					meta: a.meta as HousePackageToolMeta,
				}))
				.map((a) => {
					const m = a.meta?.priceTags?.moulding as
						| MouldingPriceMeta
						| undefined;
					const overridePrice = m?.overridePrice || m?.overridPrice;
					const qty = a?.salesOrderItem?.qty;
					const salesPrice = overridePrice || m?.salesPrice || m?.price;
					return {
						qty,
						salesPrice,
						m: !salesPrice ? m : undefined,
						costPrice: overridePrice || m?.basePrice || salesPrice,
					};
				});

			const units = doorsCount
				? sum(d?.salesDoors || [], "totalQty")
				: isMolding
					? sum(hpts.map((a) => a?.qty))
					: d?._count.stepForms;
			const salesPrice = doorsCount
				? formatMoney(sum(d.salesDoors, "jambSizePrice"))
				: isMolding
					? formatMoney(sum(hpts.map((a) => a.salesPrice)) * units)
					: formatMoney(sum(d.stepForms, "price"));
			const costPrice = doorsCount
				? formatMoney(sum(d.salesDoors, "jambSizePrice"))
				: isMolding
					? formatMoney(sum(hpts.map((a) => a?.costPrice)) * units)
					: formatMoney(sum(d.stepForms, "basePrice"));
			return {
				id: d.id,
				name: d.name || d.product?.title,
				category: d.step?.title,
				units,
				revenue: sum([salesPrice, -1 * costPrice]),
				salesPrice,
				costPrice,
				img: d.img || d.product?.img,
				date: d.createdAt,
				productCode,
				salesCount,
			};
		})
		.filter((row) => Number(row.salesCount || 0) > 0)
		.sort((a, b) => {
			const salesCountDiff =
				Number(b.salesCount || 0) - Number(a.salesCount || 0);

			if (salesCountDiff !== 0) return salesCountDiff;

			const unitsDiff = Number(b.units || 0) - Number(a.units || 0);

			if (unitsDiff !== 0) return unitsDiff;

			const nameDiff = (a.name || "").localeCompare(b.name || "");

			if (nameDiff !== 0) return nameDiff;

			return Number(a.id || 0) - Number(b.id || 0);
		})
		.slice(cursor, cursor + pageSize);

	return await response(rows);
}
function whereStat(query: ProductReportSchema) {
	const stepFormSalesWhere = getStepFormSalesWhere(query);
	const salesDoorWhere = getSalesDoorWhere(query);
	const housePackageToolWhere = getHousePackageToolWhere(query);
	const where: Prisma.DykeStepProductsWhereInput[] = [
		{
			deletedAt: null,
			step: {
				deletedAt: null,
			},
		},
		{
			OR: [
				{
					name: {
						not: null,
					},
				},
				{
					product: {
						title: { not: null },
					},
				},
			],
		},
		{
			// OR: [
			//   {
			//     door: {
			//       ...dateQuery({
			//         from: "01/01/2025",
			//       }),
			//     },
			//   },
			//   {
			//     product: {
			//       ...dateQuery({
			//         from: "01/01/2025",
			//       }),
			//     },
			//   },
			//   {
			//     product: null,
			//     door: null,
			//   },
			// ],

			OR: [
				{
					stepForms: {
						some: stepFormSalesWhere,
					},
				},
				{
					salesDoors: {
						some: salesDoorWhere,
					},
				},
				{
					housePackageTools: {
						some: housePackageToolWhere,
					},
				},
			],
		},
	];
	if (query.reportCategory) {
		where.push({
			step: {
				title: query.reportCategory,
			},
		});
	}
	if (query.productId) {
		where.push({
			id: query.productId,
		});
	}
	if (query.q) {
		const contains = {
			contains: query.q,
			// mode: "insensitive",
		};
		where.push({
			OR: [
				{ name: contains },
				{
					product: {
						title: contains,
					},
				},
				{
					step: {
						title: contains,
					},
				},
			],
		});
	}
	return composeQuery(where);
}
