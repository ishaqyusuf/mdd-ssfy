"use client";

import { getCustomerRecentSales } from "@/actions/get-customer-recent-sales";
import ProgressStatus from "@/components/_v1/progress-status";
import { DataSkeleton } from "@/components/data-skeleton";
import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { formatDate } from "@/lib/use-day";
import { formatMoney } from "@/lib/use-number";
import { toFnType } from "@/utils/server-data-type";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

export function SalesList({ data }) {
    const skel = useDataSkeleton();
    let list = toFnType(getCustomerRecentSales, data);

    return !skel.loading && !list?.length ? (
        <>
            <div className="flex h-40 items-center justify-center">
                <p className="text-muted-foreground">
                    No customer sales data available
                </p>
            </div>
        </>
    ) : (
        <Table className="table-sm">
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>P.O</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead align="right" className="text-right">
                        Amount
                    </TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {skel.renderList(list).map((tx, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <DataSkeleton pok="date">
                                {formatDate(tx?.salesDate)}
                            </DataSkeleton>
                        </TableCell>
                        <TableCell>
                            <DataSkeleton pok="textSm">{tx?.poNo}</DataSkeleton>
                        </TableCell>
                        <TableCell>
                            <DataSkeleton pok="textSm">
                                {tx?.orderId}
                            </DataSkeleton>
                        </TableCell>
                        <TableCell align="right">
                            $
                            <DataSkeleton as="span" pok="moneyLarge">
                                {formatMoney(tx?.invoice?.total)}
                            </DataSkeleton>
                        </TableCell>
                        <TableCell>
                            <DataSkeleton as="span" pok="textSm">
                                <ProgressStatus
                                    status={tx?.status?.delivery?.status}
                                />
                            </DataSkeleton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
