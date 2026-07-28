import { activityOr, activityTag } from "@notifications/activity-tree";

export function buildSalesOverviewActivityFilter(saleData: {
	id: number | string;
	orderId?: number | string | null;
}) {
	const orderId = String(saleData.orderId ?? "").trim();
	const filters = [activityTag("salesId", String(saleData.id))];

	if (orderId) {
		filters.push(
			activityTag("salesNo", orderId),
			activityTag("orderNos", orderId),
		);
	}

	return activityOr(filters);
}
