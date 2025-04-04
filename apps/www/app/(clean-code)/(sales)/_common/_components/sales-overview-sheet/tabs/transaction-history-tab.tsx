"use client";

import { getSalesPaymentsAction } from "@/actions/get-sales-payment";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import Money from "@/components/_v1/money";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { TransactionsTab } from "@/components/sheets/customer-overview-sheet/transactions-tab";
import useEffectLoader from "@/lib/use-effect-loader";

import { Badge } from "@gnd/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { salesOverviewStore } from "../store";
import NoResults from "./empty-tx-history";

export function TransactionHistoryTab() {
    return <TransactionsTab salesId={salesOverviewStore().salesId} />;
    const store = salesOverviewStore();
    const ctx = useEffectLoader(
        async () =>
            getSalesPaymentsAction({
                "sales.id": store.salesId,
            }),
        {
            onSuccess(data) {
                console.log(data);
            },
        },
    );
    async function deleteTransaction(id) {
        //
    }
    if (!ctx?.data?.length) return <NoResults />;
    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment Method</TableHead>
                        {/* <TableHead>Processed By</TableHead> */}
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ctx.data?.map((tx) => (
                        <TableRow key={tx.paymentId}>
                            <TableCell>
                                {/* <TCell.Primary>{tx.paymentId}</TCell.Primary> */}
                                <TCell.Date>{tx.date}</TCell.Date>
                            </TableCell>
                            <TableCell>
                                <TCell.Secondary>
                                    <span>{tx.note}</span>
                                </TCell.Secondary>
                                <TCell.Secondary>
                                    <Badge
                                        variant="secondary"
                                        className="px-1 py-0 uppercase"
                                    >
                                        {tx.paymentMethod}
                                    </Badge>
                                    {!tx.receivedBy || (
                                        <>
                                            {" by "}
                                            {tx.receivedBy}
                                        </>
                                    )}
                                </TCell.Secondary>
                            </TableCell>
                            {/* <TableCell>
                                <>{tx.receivedBy}</>
                            </TableCell> */}
                            <TableCell>
                                <Money value={Math.abs(tx.amount)} />
                            </TableCell>
                            <TableCell>
                                <TCell.Status status={tx.status} />
                            </TableCell>
                            <TableCell>
                                <ConfirmBtn
                                    onClick={() => deleteTransaction(tx.id)}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
