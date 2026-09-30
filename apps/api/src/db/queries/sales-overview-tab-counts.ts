import type { Prisma } from "@gnd/db";
import type { SalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";

export const salesOverviewTabCountsSelect = {
	deliveries: { where: { deletedAt: null } },
	payments: {
		where: {
			deletedAt: null,
			OR: [{ origin: null }, { origin: { not: "square_refund" } }],
		},
	},
} satisfies Prisma.SalesOrdersCountOutputTypeSelect;

export function buildSalesOverviewTabCounts(
	counts: { deliveries: number; payments: number },
	pipeline: Pick<SalesPipelineSnapshot, "production"> | null,
) {
	return {
		productionQty: pipeline?.production.requiredQty ?? 0,
		transactions: counts.payments,
		dispatch: counts.deliveries,
	};
}
