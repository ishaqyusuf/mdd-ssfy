"use client";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
// import { FormatAmount } from "@/components/format-amount";
// import { InvoiceStatus } from "@/components/invoice-status";
// import { useInvoiceParams } from "@/hooks/use-invoice-params";
import { getDueDateStatus } from "@/utils/format";
import { formatDate } from "@/utils/format";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/custom/progress";
import { FormatAmount } from "@gnd/ui/custom/format-amount";

type Props = {
    invoice: NonNullable<RouterOutputs["sales"]["index"]["data"]>[number];
};

export function InvoiceRow({ invoice }: Props) {
    // const { setParams } = useOrderFilterParams();

    const overviewQuery = useSalesOverviewQuery();
    const showDate = !!invoice.due;

    return (
        <>
            <li
                key={invoice.id}
                className="h-[57px] flex items-center w-full"
                onClick={
                    () => overviewQuery.open2(invoice.slug, "sales")
                    // setParams({ invoiceId: invoice.id, type: "details" })
                }
            >
                <div className="flex items-center w-full">
                    <div className="flex flex-col space-y-1 w-[90px]">
                        <span>{invoice.orderId}</span>
                        {/* <span className="text-sm">
                            {invoice.dueDate
                                ? formatDate(invoice.dueDate)
                                : "-"}
                        </span>
                        {showDate && (
                            <span className="text-xs text-muted-foreground">
                                {invoice.dueDate
                                    ? getDueDateStatus(invoice.dueDate)
                                    : "-"}
                            </span> */}
                        {/* )} */}
                    </div>

                    {/* <div className="w-[85px]">
                        
                        <Progress.Status>
                            {invoice?.deliveryStatus || "-"}
                        </Progress.Status>
                    </div> */}

                    <div className="flex-1 text-sm line-clamp-1 pr-4">
                        {invoice.displayName}
                    </div>

                    <div
                        className={cn(
                            "w-1/4 flex justify-end text-sm",
                            // invoice.status === "canceled" && "line-through",
                        )}
                    >
                        <FormatAmount amount={invoice.invoice.total ?? 0} />
                    </div>
                </div>
            </li>
        </>
    );
}

