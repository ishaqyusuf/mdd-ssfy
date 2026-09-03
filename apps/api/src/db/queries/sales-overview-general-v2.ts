import { salesOverviewDto } from "@api/dto/sales-dto";
import type { GetSaleOverviewSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { SalesType } from "@api/type";
import { SalesOverviewInclude } from "@api/utils/sales";
import { resolveSalesOverviewDocumentReadiness } from "@gnd/sales/pdf-system";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";
import { observeSalesPipelineReadProjection } from "@gnd/sales/sales-pipeline-rollout";
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

	const [inventoryInboundOwnership, documentSnapshot, pipelineSnapshots] =
		await Promise.all([
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
			getSalesPipelineSnapshots(ctx.db, [sale.id]),
		]);
	const canonicalPipeline = pipelineSnapshots.get(sale.id) ?? null;
	const pipeline = canonicalPipeline
		? observeSalesPipelineReadProjection(canonicalPipeline, {
				surface: "sales.overview.general",
			})
		: null;

	return {
		...overview,
		pipeline,
		canonicalStatus: pipeline?.headline.code ?? "unknown",
		statusLabel: pipeline?.headline.label ?? "Unknown",
		statusTone: pipeline?.headline.tone ?? "slate",
		inventoryInboundOwnership,
		documentReadiness: resolveSalesOverviewDocumentReadiness({
			saleUpdatedAt: sale.updatedAt,
			snapshot: documentSnapshot,
		}),
	};
}
