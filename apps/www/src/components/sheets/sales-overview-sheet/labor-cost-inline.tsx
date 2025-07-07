"use client";

import { updateSalesLaborCostAction } from "@/actions/update-sales-labor-cost-action";
import { refreshTabData } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin/helper";
import { salesOverviewStore } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin/store";
import { InfoLine } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin/tabs/sales-info-tab";

import Money from "../../_v1/money";
import { revalidateTable } from "../../(clean-code)/data-table/use-infinity-data-table";
import { InlineTextEditor } from "../../inline-text-editor";

export function LaborCostInline() {
    const store = salesOverviewStore();
    const overview = store.overview;
    async function updateCost(value) {
        await updateSalesLaborCostAction(overview.id, Number(value));
        refreshTabData(store.currentTab);
        revalidateTable();
    }

    return (
        <InfoLine
            label="Labour Cost"
            value={
                <InlineTextEditor
                    onUpdate={updateCost}
                    className="w-24"
                    value={overview?.invoice?.labour}
                >
                    <Money value={overview?.invoice?.labour} />
                </InlineTextEditor>
            }
        ></InfoLine>
    );
}
