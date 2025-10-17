"use client";

import { updateSalesLaborCostAction } from "@/actions/update-sales-labor-cost-action";

import Money from "../../_v1/money";
import { InlineTextEditor } from "../../inline-text-editor";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { LineInfo } from "@/components/line-info";
import { useSaleOverview } from "./context";

export function LaborCostInline() {
    const store = useSaleOverview();
    const overview = store.data;
    const qs = useSalesQueryClient();
    async function updateCost(value) {
        await updateSalesLaborCostAction(overview.id, Number(value));
        qs.salesPaymentUpdated();
    }

    return (
        <LineInfo
            label="Labour Cost"
            value={
                <></>
                // <InlineTextEditor
                //     onUpdate={updateCost}
                //     className="w-24"
                //     value={overview?.labn?.labour}
                // >
                //     <Money value={overview?.invoice?.labour} />
                // </InlineTextEditor>
            }
        ></LineInfo>
    );
}
