import { useEffect, useRef, useState } from "react";
import { updateSalesMetaAction } from "@/actions/update-sales-meta-action";
import { DataSkeleton } from "@/components/data-skeleton";
import { LabelInput } from "@/components/label-input";
import { useDebounce } from "@/hooks/use-debounce";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function SalesPO({ value, salesId }) {
    const ctx = useSalesOverviewQuery();

    const [inputValue, setInputValue] = useState<string>(value || "");
    const deb = useDebounce(inputValue, 1000);
    const hasMounted = useRef(false);

    useEffect(() => {
        if (!salesId) return;
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        if (value !== deb) {
            updateSalesMetaAction(salesId, {
                po: deb?.toUpperCase(),
            }).then(() => {
                ctx.salesQuery.invalidate.saleOverview();
                ctx.salesQuery.invalidate.salesList();
            });
        }
    }, [deb, value, salesId]);

    return (
        <div>
            <p className="text-muted-foreground">P.O No</p>
            <DataSkeleton className="font-medium" placeholder="Standard">
                <LabelInput
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-24 uppercase"
                    value={inputValue}
                />
            </DataSkeleton>
        </div>
    );
}
