import { Button } from "@gnd/ui/button";
import { Collapsible } from "@gnd/ui/namespace";
import { useSaleOverview } from "./sheets/sales-overview-sheet/context";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function SalesPaymentForm() {
    const { setParams } = useSalesOverviewQuery();
    return (
        <div className="px-4">
            <Collapsible open={true}>
                <Collapsible.Trigger asChild>
                    <div className="flex gap-4">
                        <div className="flex-1" />
                        <Button>Pay</Button>
                    </div>
                </Collapsible.Trigger>
                <Collapsible.Content>
                    <>....</>
                </Collapsible.Content>
            </Collapsible>
        </div>
    );
}

