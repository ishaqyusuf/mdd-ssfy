import type { Db } from "@gnd/db";

import type { ProductionV2DetailQuery } from "../contracts";
import { getSaleInformation } from "../../sales-control/get-sale-information";

export async function getProductionOrderDetailV2(
	db: Db,
	query: ProductionV2DetailQuery,
) {
	const resolvedAssignedToId =
		query.scope === "worker" ? query.workerId || undefined : undefined;
	const data = await getSaleInformation(db, {
		salesNo: query.salesNo,
		assignedToId: resolvedAssignedToId,
	});

	return {
		orderId: data.order.orderId,
		salesId: data.order.id,
		customer:
			data.order.customer?.name || data.order.customer?.businessName || null,
		items: data.items.map((item) => ({
			controlUid: item.controlUid,
			salesId: item.salesId,
			itemId: item.itemId,
			title: item.title,
			subtitle: item.subtitle,
			sectionTitle: item.sectionTitle,
			configs: item.configs?.filter((config) => !config.hidden) || [],
			hands: item.hands,
			analytics: item.analytics,
			itemConfig: item.itemConfig,
			deliverables: item.deliverables,
		})),
		actions: {
			canQuickAssign: query.scope === "admin",
			canSubmitProduction: query.scope === "worker",
			canDeleteSubmission: query.scope === "worker",
		},
	};
}
