import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";
import { Item } from "./columns";
import { cn } from "@gnd/ui/cn";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@gnd/ui/table";
import { Button } from "@gnd/ui/button";
import { useSalesQuickPay } from "@/hooks/use-sales-quick-pay";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useState } from "react";

export function InvoiceColumn({ item }: { item: Item }) {
    const { pending, paid, total } = item.invoice;
    const [opened, setOpened] = useState(false);
    // const [pamentFormOpened, setPaymentFormOpened] = useState(false);
    const qpCtx = useSalesQuickPay();
    const customerQuery = useCustomerOverviewQuery();
    function pay() {
        // qpCtx.setParams({
        //     quickPaySalesId: item.id,
        // });
        setOpened(true);
        setTimeout(() => {
            customerQuery.pay({
                phoneNo: item.customerPhone,
                orderId: item.id,
                customerId: item.customerId,
            });
            setOpened(false);
        }, 1000);
    }
    return (
        <div className="text-right relative z-10">
            <TooltipProvider delayDuration={70}>
                <Tooltip>
                    <TooltipTrigger>
                        <TCell.Money
                            value={item.invoice.total}
                            className={cn(
                                "font-mono font-medium",
                                pending == total
                                    ? "text-red-600"
                                    : pending > 0
                                      ? "text-purple-500"
                                      : "text-green-600",
                            )}
                        />
                    </TooltipTrigger>
                    <TooltipContent
                        align="end"
                        side="left"
                        onClick={(e) => {
                            e.preventDefault();
                        }}
                        className={cn(
                            "px-3 py-1.5 text-xs space-y-2 relative z-[999]",
                            opened && "size-0",
                        )}
                        sideOffset={10}
                    >
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableHead>Pending</TableHead>
                                    <TableCell className="text-left">
                                        <TCell.Money
                                            value={pending}
                                        ></TCell.Money>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableHead>Paid</TableHead>
                                    <TableCell className="text-left">
                                        <TCell.Money value={paid}></TCell.Money>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableHead>Total</TableHead>
                                    <TableCell className="text-left">
                                        <TCell.Money
                                            value={total}
                                        ></TCell.Money>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Button
                            className="w-full"
                            disabled={!item.due}
                            onClick={pay}
                        >
                            <span>Apply Payment</span>
                        </Button>

                        {/* <SalesPayWidget /> */}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

