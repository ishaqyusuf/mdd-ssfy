"use client";

import { useState } from "react";
import { updateSalesDateAction } from "@/actions/update-sales-date-action";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { DatePicker } from "../../_v1/date-range-picker";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useSaleOverview } from "./context";
import { LineInfo } from "@/components/line-info";

export function SalesDateInline() {
    const store = useSaleOverview();
    const [value, setValue] = useState(store?.data?.createdAt);
    const qs = useSalesQueryClient();
    const updateSalesDate = useAction(updateSalesDateAction, {
        onSuccess(args) {
            toast.success("Date updated");
            qs.salesCreated();
            setValue(args.input.newDate as any);
        },
        onError(e) {
            toast.error("unable to complete");
        },
    });
    return (
        <LineInfo
            label="Date Created"
            value={
                <DatePicker
                    // disabled={(date) => date > new Date()}
                    setValue={(e) => {
                        updateSalesDate.execute({
                            id: store?.data?.id,
                            newDate: e,
                        });
                    }}
                    className="h-8 w-auto"
                    value={value}
                />
            }
        ></LineInfo>
    );
}
