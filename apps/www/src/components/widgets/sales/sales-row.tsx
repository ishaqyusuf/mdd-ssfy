"use client";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
// import { FormatAmount } from "@/components/format-amount";
// import { InvoiceStatus } from "@/components/invoice-status";
// import { useInvoiceParams } from "@/hooks/use-invoice-params";
import { getDueDateStatus } from "@/utils/format";
import { formatDate } from "@/utils/format";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { cn } from "@gnd/ui/cn";
import { FormatAmount } from "@gnd/ui/custom/format-amount";
import { Progress } from "@gnd/ui/custom/progress";

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
				className="flex h-[57px] w-full min-w-0 items-center"
			>
				<button
					type="button"
					className="flex h-full min-w-0 w-full items-center text-left"
					onClick={() => overviewQuery.open2(invoice.slug, "sales")}
				>
					<div className="flex w-[76px] shrink-0 flex-col space-y-1 sm:w-[90px]">
						<span className="truncate text-sm">{invoice.orderId}</span>
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

					<div className="min-w-0 flex-1 truncate pr-3 text-sm">
						{invoice.displayName}
					</div>

					<div
						className={cn(
							"flex shrink-0 justify-end text-sm",
							// invoice.status === "canceled" && "line-through",
						)}
					>
						<FormatAmount amount={invoice.invoice.total ?? 0} />
					</div>
				</button>
			</li>
		</>
	);
}
