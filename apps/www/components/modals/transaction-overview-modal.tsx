"use client";

import { getCustomerTransactionOverviewAction } from "@/actions/get-customer-transaction-overview";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import { cn } from "@/lib/utils";
import { skeletonListData } from "@/utils/format";
import { useAsyncMemo } from "use-async-memo";

import { Badge } from "@gnd/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@gnd/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { TCell } from "../(clean-code)/data-table/table-cells";
import { DataSkeleton } from "../data-skeleton";
import { DeleteCustomerTxBtn } from "../delete-customer-transaction-btn";

export function TransactionOverviewModal({}) {
    const ctx = useTransactionOverviewModal();

    const txData = useAsyncMemo(async () => {
        return await getCustomerTransactionOverviewAction(ctx.transactionId);
    }, [ctx.transactionId]);
    return (
        <DataSkeletonProvider
            value={
                {
                    loading: ctx.transactionId && !txData?.id,
                } as any
            }
        >
            <Dialog
                open={!!ctx.transactionId}
                onOpenChange={() => ctx.setParams(null)}
            >
                <DialogContent className="min-w-max max-w-xl">
                    <DialogTitle>Transaction Detail</DialogTitle>
                    <DialogDescription></DialogDescription>
                    <div className="">
                        <Table className="table-sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skeletonListData(
                                    txData?.salesTx?.transactions,
                                    2,
                                    {},
                                )?.map((tx, i) => (
                                    <TableRow key={i} className={cn("")}>
                                        <TableCell>
                                            <DataSkeleton pok="date">
                                                <TCell.Date>
                                                    {tx.date}
                                                </TCell.Date>
                                            </DataSkeleton>
                                        </TableCell>
                                        <TableCell>
                                            <DataSkeleton pok="textLg">
                                                <TCell.Secondary>
                                                    <span>{tx.note}</span>
                                                </TCell.Secondary>
                                            </DataSkeleton>
                                            <TCell.Secondary className="inline-flex gap-2">
                                                <DataSkeleton pok="textSm">
                                                    <Badge
                                                        variant="secondary"
                                                        className="px-1 py-0 uppercase"
                                                    >
                                                        {tx.paymentMethod}
                                                    </Badge>
                                                </DataSkeleton>
                                                <DataSkeleton pok="textSm">
                                                    {!tx.receivedBy || (
                                                        <>
                                                            {" by "}
                                                            {tx.receivedBy}
                                                        </>
                                                    )}
                                                </DataSkeleton>
                                            </TCell.Secondary>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            <DataSkeleton pok="textSm">
                                                <TCell.Status
                                                    status={tx.status}
                                                />
                                            </DataSkeleton>
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="mt-2">
                            <DeleteCustomerTxBtn
                                transactionId={ctx.transactionId}
                                btnProps={{
                                    size: "default",
                                    variant: "destructive",
                                    className: "w-full",
                                    children: <>Delete</>,
                                }}
                                onDelete={() => {
                                    ctx?.setParams(null);
                                }}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DataSkeletonProvider>
    );
}
