import { useSalesOverviewV2PageQuery } from "./use-sales-overview-v2-page-query";
import { useSalesOverviewV2SheetQuery } from "./use-sales-overview-v2-sheet-query";

export function useSalesOverviewOpen() {
	const sheet = useSalesOverviewV2SheetQuery();
	const page = useSalesOverviewV2PageQuery();

	return {
		// Sheet openers
		openSalesAdminSheet: (id: string) =>
			sheet.setParams({
				overviewSheetId: id,
				overviewSheetType: "sales",
				overviewSheetMode: "sales",
			}),

		openQuoteSheet: (id: string) =>
			sheet.setParams({
				overviewSheetId: id,
				overviewSheetType: "quote",
				overviewSheetMode: "quote",
			}),

		openProductionSheet: (id: string) =>
			sheet.setParams({
				overviewSheetId: id,
				overviewSheetType: "sales",
				overviewSheetMode: "sales-production",
			}),

		openDispatchSheet: (id: string, dispatchId?: string) =>
			sheet.setParams({
				overviewSheetId: id,
				overviewSheetType: "sales",
				overviewSheetMode: "dispatch-modal",
				overviewSheetDispatchId: dispatchId ?? null,
			}),

		// Page openers
		openSalesAdminPage: (id: string) =>
			page.setParams({
				overviewId: id,
				overviewType: "sales",
				overviewMode: "sales",
			}),

		openQuotePage: (id: string) =>
			page.setParams({
				overviewId: id,
				overviewType: "quote",
				overviewMode: "quote",
			}),

		openProductionPage: (id: string) =>
			page.setParams({
				overviewId: id,
				overviewType: "sales",
				overviewMode: "sales-production",
			}),

		openDispatchPage: (id: string, dispatchId?: string) =>
			page.setParams({
				overviewId: id,
				overviewType: "sales",
				overviewMode: "dispatch-modal",
				dispatchId: dispatchId ?? null,
			}),

		// Close helpers
		closeSheet: sheet.close,
		closePage: page.close,
	};
}
