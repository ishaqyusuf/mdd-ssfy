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
import { SalesQuickPayment } from "@/components/widgets/sales-quick-payment";
import { useState } from "react";

export function InvoiceColumn({ item }: { item: Item }) {
    const { pending, paid, total } = item.invoice;
    const [opened, setOpened] = useState(false);
    const [pamentFormOpened, setPaymentFormOpened] = useState(false);

    return (
        <div className="text-right relative z-10">
            <TooltipProvider delayDuration={70}>
                <Tooltip
                    open={pamentFormOpened ? true : undefined}
                    onOpenChange={(e) => {
                        if (pamentFormOpened) setPaymentFormOpened(false);
                    }}
                >
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
                        className="px-3 py-1.5 text-xs space-y-2 relative z-[999]"
                        sideOffset={10}
                    >
                        {pamentFormOpened ? (
                            <>
                                <div className="">
                                    <h1 className="text-xl font-bold">
                                        Payment form
                                    </h1>
                                </div>
                                <SalesQuickPayment
                                    opened={pamentFormOpened}
                                    setOpened={setPaymentFormOpened}
                                    salesId={item.id}
                                    amount={item.due}
                                />
                            </>
                        ) : (
                            <>
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
                                                <TCell.Money
                                                    value={paid}
                                                ></TCell.Money>
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
                                    onClick={(e) => {
                                        setPaymentFormOpened(true);
                                    }}
                                >
                                    <span>Apply Payment</span>
                                </Button>
                            </>
                        )}

                        {/* <SalesPayWidget /> */}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

