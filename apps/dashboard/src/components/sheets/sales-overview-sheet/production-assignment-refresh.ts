import { subscribeQueryEvents } from "@/lib/query-events/transport";

export const PRODUCTION_ASSIGNMENT_REFRESH_INTERVAL_MS = 5_000;

type SubscribeProductionAssignmentRefreshInput = {
	orderNo: string | null | undefined;
	refresh: () => void;
};

export function subscribeProductionAssignmentRefresh({
	orderNo,
	refresh,
}: SubscribeProductionAssignmentRefreshInput) {
	return subscribeQueryEvents((event) => {
		if (event.name !== "sales.production.changed") return;

		const sales = event.scope?.sales;
		if (sales?.length && !sales.some((sale) => sale.orderNo === orderNo)) {
			return;
		}

		refresh();
	});
}
