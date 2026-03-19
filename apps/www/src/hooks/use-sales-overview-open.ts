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
                overviewSheetType: "order",
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
                overviewSheetType: "order",
                overviewSheetMode: "sales-production",
            }),

        openDispatchSheet: (id: string, dispatchId?: string) =>
            sheet.setParams({
                overviewSheetId: id,
                overviewSheetType: "order",
                overviewSheetMode: "dispatch-modal",
                overviewSheetDispatchId: dispatchId ?? null,
            }),

        // Page openers
        openSalesAdminPage: (id: string) =>
            page.setParams({
                overviewId: id,
                overviewType: "order",
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
                overviewType: "order",
                overviewMode: "sales-production",
            }),

        openDispatchPage: (id: string, dispatchId?: string) =>
            page.setParams({
                overviewId: id,
                overviewType: "order",
                overviewMode: "dispatch-modal",
                dispatchId: dispatchId ?? null,
            }),

        // Close helpers
        closeSheet: sheet.close,
        closePage: page.close,
    };
}

