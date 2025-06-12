import { cancelSalesPaymentAction } from "@/actions/cancel-sales-payment";
import { getSalesPaymentsAction } from "@/actions/get-sales-payment";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import { DataSkeleton } from "@/components/data-skeleton";
import { EmptyState } from "@/components/empty-state";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { cn } from "@/lib/utils";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { useAction } from "next-safe-action/hooks";

interface Props {
    accountNo?: string;
    salesId?: string;
}
export function TransactionsTab({ accountNo, salesId }: Props) {
    const loader = async () =>
        await getSalesPaymentsAction({
            "order.no": salesId,
            "account.no": accountNo,
        });
    const skel = useCreateDataSkeletonCtx({
        loader,
        autoLoad: true,
    });
    const data = skel?.data;
    const toast = useLoadingToast();
    const cancelTx = useAction(cancelSalesPaymentAction, {
        onSuccess(args) {
            toast.display({
                title: "Cancelled",
                duration: 2000,
                variant: "destructive",
            });
            revalidateTable();
            skel?.load();
            // onDelete?.();
        },
        onExecute(args) {
            toast.display({
                title: "Unable to complete",
                duration: 2000,
                variant: "error",
            });
        },
    });
    return (
        <EmptyState
            empty={data?.status && data?.transactions?.length == 0}
            title="Empty Transactions"
            description={
                salesId
                    ? `No transactions found for ${salesId}`
                    : `No transactions found for ${accountNo}`
            }
        >
            <DataSkeletonProvider value={skel}>
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
                        {skel
                            .renderList(data?.transactions, 5, {})
                            ?.map((tx, i) => (
                                <TableRow key={i} className={cn("")}>
                                    <TableCell>
                                        <DataSkeleton pok="date">
                                            <TCell.Date>{tx.date}</TCell.Date>
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
                                            <TCell.Status status={tx.status} />
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell className="inline-flex justify-end items-center">
                                        <Button
                                            size="xs"
                                            variant="destructive"
                                            onClick={(e) => {
                                                cancelTx.execute({
                                                    salesPaymentId: tx.id,
                                                });
                                            }}
                                            disabled={
                                                tx.status == "cancelled" ||
                                                cancelTx.isExecuting
                                            }
                                        >
                                            cancel
                                        </Button>
                                        {/* <TCell.DeleteRow
                                            data={tx}
                                            action={(e) => {
                                                console.log(tx);
                                            }}
                                        /> */}
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </DataSkeletonProvider>
        </EmptyState>
    );
}
