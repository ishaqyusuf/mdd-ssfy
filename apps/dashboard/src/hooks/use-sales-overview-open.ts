import { useSalesOverviewQuery } from "./use-sales-overview-query";

export function useSalesOverviewOpen() {
	const overview = useSalesOverviewQuery();

	return {
		openOrder: (id: string) => overview.open(id, "sales"),
		openQuote: (id: string) => overview.open(id, "quote"),
		openProduction: (id: string) =>
			overview.open(id, "sales-production", { salesTab: "production" }),
		openDispatch: (id: string, dispatchId?: string | number) =>
			overview.open(id, "dispatch-modal", {
				dispatchId,
				salesTab: "packing",
			}),
		close: overview.close,
	};
}
