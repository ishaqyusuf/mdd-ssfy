import { useEffect, useState } from "react";
import { updateSalesMetaAction } from "@/actions/update-sales-meta-action";
import { DataSkeleton } from "@/components/data-skeleton";
import { LabelInput } from "@/components/label-input";
import { useDebounce } from "@/hooks/use-debounce";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString } from "@/lib/utils";

export function SalesPO({ value, salesId }) {
    const ctx = useSalesOverviewQuery();

    const [inputValue, setInputValue] = useState<string>(value || "");
    const deb = useDebounce(inputValue, 1000);
    useEffect(() => {
        if (!salesId) return;
        if (value != deb) {
            updateSalesMetaAction(salesId, {
                po: deb?.toUpperCase(),
            }).then((e) => {
                ctx.setParams({
                    refreshTok: generateRandomString(),
                });
            });
        }
    }, [deb, value, salesId]);
    return (
        <div>
            <p className="text-muted-foreground">P.O No</p>
            <DataSkeleton className="font-medium" placeholder="Standard">
                <LabelInput
                    onChange={(e) => {
                        const d = e.target.value;
                        setInputValue(d);
                    }}
                    className="w-24 uppercase"
                    value={inputValue}
                />
                {value}
                {inputValue}
            </DataSkeleton>
        </div>
    );
}
