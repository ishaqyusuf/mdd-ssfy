"use client";

import { useState } from "react";
import { updateSalesDateAction } from "@/actions/update-sales-date-action";
import { refreshTabData } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin/helper";
import { salesOverviewStore } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin/store";
import { InfoLine } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin/tabs/sales-info-tab";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { DatePicker } from "../../_v1/date-range-picker";
import { revalidateTable } from "../../(clean-code)/data-table/use-infinity-data-table";

export function SalesDateInline() {
    const store = salesOverviewStore();
    const overview = store.overview;
    const [value, setValue] = useState(store.overview?.createdAt);
    const updateSalesDate = useAction(updateSalesDateAction, {
        onSuccess(args) {
            toast.success("Date updated");
            refreshTabData(store.currentTab);
            revalidateTable();
            setValue(args.input.newDate);
        },
        onError(e) {
            toast.error("unable to complete");
        },
    });
    return (
        <InfoLine
            label="Date Created"
            value={
                <DatePicker
                    // disabled={(date) => date > new Date()}
                    setValue={(e) => {
                        updateSalesDate.execute({
                            id: store.overview.id,
                            newDate: e,
                        });
                    }}
                    className="h-8 w-auto"
                    value={value}
                />
            }
        ></InfoLine>
    );
}
