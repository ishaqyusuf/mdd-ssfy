"use client";

import { getCustomerTransactionOverviewAction } from "@/actions/get-customer-transaction-overview";
import { updateSalesDueAmount } from "@/actions/update-sales-due-amount";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
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

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function TransactionOverviewModal({}) {
    const ctx = useTransactionOverviewModal();
    const txData = useAsyncMemo(async () => {
        return await getCustomerTransactionOverviewAction(ctx.transactionId);
    }, [ctx.transactionId]);
    const loader = useLoadingToast();
    async function updateSalesDue() {
        loader.loading("Updating sales due amount...");
        try {
            await Promise.all(
                txData?.salesTx?.transactions.map(async (tx) => {
                    await updateSalesDueAmount(tx.salesId);
                }),
            );
            loader.success("Sales due amount updated.");
        } catch (error) {
            loader.error("Failed to update sales due amount.");
        }
    }
    const salesOverview = useSalesOverviewQuery();
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
                                    <TableRow
                                        onClick={(e) => {
                                            salesOverview.open2(
                                                tx?.salesNo,
                                                "sales",
                                            );
                                        }}
                                        key={i}
                                        className={cn("")}
                                    >
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
                        {/* <div className="mt-2 flex flex-col space-y-2">
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
                            <Button
                                // disabled={loader?.toastId}
                                variant="outline"
                                size="default"
                                className="w-full"
                                onClick={async () => {
                                    await updateSalesDue();
                                }}
                            >
                                Update Sales Due Amount
                            </Button>
                        </div> */}
                    </div>
                </DialogContent>
            </Dialog>
        </DataSkeletonProvider>
    );
}
