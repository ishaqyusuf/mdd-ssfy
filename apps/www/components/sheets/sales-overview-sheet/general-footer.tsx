import { useTransition } from "react";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { SheetFooter } from "@gnd/ui/sheet";

import { CustomSheetContentPortal } from "../custom-sheet-content";

export function GeneralFooter({ data }) {
    const [loading, startTransition] = useTransition();
    const qs = useSalesOverviewQuery();
    async function reset() {
        startTransition(async () => {
            try {
                const resp = await resetSalesStatAction(
                    data?.id,
                    data?.orderId,
                );
                toast.success("Reset complete");
                qs._refreshToken();
                // qs.setParams({
                //     refreshTok: generateRandomString(),
                // });
            } catch (error) {
                toast.error("Unable to complete");
            }
        });
    }
    return (
        <CustomSheetContentPortal>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
                <span>{data?.orderId}</span>
                <Button onClick={reset} disabled={loading}>
                    Reset
                </Button>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
