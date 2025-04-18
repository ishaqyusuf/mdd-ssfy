import { useTransition } from "react";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";

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
                // qs.setParams({
                //     refreshTok: generateRandomString(),
                // });
            } catch (error) {
                toast.error("Unable to complete");
            }
        });
    }
    return (
        <div className="fixed bottom-0 right-[1/2] p-2 py-8">
            <span>{data?.orderId}</span>
            <Button onClick={reset} disabled={loading}>
                Reset
            </Button>
        </div>
    );
}
