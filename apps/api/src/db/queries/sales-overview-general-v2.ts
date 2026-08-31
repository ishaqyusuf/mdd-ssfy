import { salesOverviewDto } from "@api/dto/sales-dto";
import type { GetSaleOverviewSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { SalesType } from "@api/type";
import { SalesOverviewInclude } from "@api/utils/sales";
import { resolveSalesOverviewDocumentReadiness } from "@gnd/sales/pdf-system";
import { getSalesInventoryInboundOwnership } from "./sales-inventory-inbound-ownership";

const {
	items: _items,
	salesProfile: _salesProfile,
	deliveries: _deliveries,
	...SalesOverviewGeneralV2BaseInclude
} = SalesOverviewInclude;

const SalesOverviewGeneralV2Include = {
	...SalesOverviewGeneralV2BaseInclude,
	deliveries: {
		where: { deletedAt: null },
		orderBy: { id: "desc" as const },
		take: 1,
		select: {
			id: true,
			deliveryMode: true,
			dueDate: true,
			status: true,
			_count: {
				select: {
					items: true,
				},
			},
		},
	},
};

export { SalesOverviewGeneralV2Include };

export async function getSaleOverviewGeneralV2(
	ctx: TRPCContext,
	query: GetSaleOverviewSchema,
) {
	const orderNo = query.orderNo?.trim();
	if (!orderNo) return null;
	const salesType = (query.salesType ?? "order") as SalesType;
	const sale = await ctx.db.salesOrders.findFirst({
		where: {
			orderId: orderNo,
			type: salesType,
			deletedAt: null,
		},
		include: SalesOverviewGeneralV2Include,
	});
	if (!sale) return null;

	const overview = salesOverviewDto(sale as never, salesType);
	if (salesType === "quote") return overview;

	const [inventoryInboundOwnership, documentSnapshot] = await Promise.all([
		getSalesInventoryInboundOwnership(ctx.db, sale.id),
		ctx.db.salesDocumentSnapshot.findFirst({
			where: {
				salesOrderId: sale.id,
				documentType: { startsWith: "invoice_pdf" },
				isCurrent: true,
				deletedAt: null,
			},
			orderBy: [{ generatedAt: "desc" }, { updatedAt: "desc" }],
			select: {
				id: true,
				generationStatus: true,
				storedDocumentId: true,
				sourceUpdatedAt: true,
				generatedAt: true,
				errorMessage: true,
			},
		}),
	]);

	return {
		...overview,
		inventoryInboundOwnership,
		documentReadiness: resolveSalesOverviewDocumentReadiness({
			saleUpdatedAt: sale.updatedAt,
			snapshot: documentSnapshot,
		}),
	};
}
