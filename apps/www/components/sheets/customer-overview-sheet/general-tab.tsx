"use client";

import { useEffect } from "react";
import { getCustomerGeneralInfoAction } from "@/actions/get-customer-general-info";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import Money from "@/components/_v1/money";
import ProgressStatus from "@/components/_v1/progress-status";
import { DataSkeleton } from "@/components/data-skeleton";
import { DeleteCustomerTxBtn } from "@/components/delete-customer-transaction-btn";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { formatDate } from "@/lib/use-day";
import { formatMoney } from "@/lib/use-number";
import { getInitials } from "@/utils/format";
import { Wallet } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { Footer } from "./footer";
import { SalesList } from "./sales-list";

export function GeneralTab({ setCustomerName }) {
    const query = useCustomerOverviewQuery();

    // const [data, setData] = useState<CustomerGeneralInfo | null>(null);
    // const [loading, setLoading] = useState(true);

    const loader = async () =>
        await getCustomerGeneralInfoAction(query.accountNo);
    const skel = useCreateDataSkeletonCtx({
        loader,
        autoLoad: true,
    });
    const data = skel?.data;
    useEffect(() => {
        if (data) {
            setCustomerName(data.displayName || data.accountNo);
        }
    }, [data]);
    return (
        <div className="space-y-4">
            <DataSkeletonProvider value={skel}>
                <div className="flex items-center gap-4">
                    <DataSkeleton
                        className="h-16 w-16 rounded-full"
                        placeholder="LOREM"
                    >
                        <Avatar className="h-16 w-16">
                            <AvatarImage
                                src={data?.avatarUrl}
                                alt={data?.displayName}
                            />
                            <AvatarFallback>
                                {getInitials(data?.displayName)}
                            </AvatarFallback>
                        </Avatar>
                    </DataSkeleton>
                    <div>
                        <h3 className="text-lg font-semibold">
                            <DataSkeleton placeholder="Ishaq Yusuf">
                                {data?.displayName}
                            </DataSkeleton>
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Customer ID:{" "}
                            <DataSkeleton
                                as="span"
                                placeholder="234 8186877307"
                            >
                                {data?.accountNo}
                            </DataSkeleton>
                        </p>
                    </div>
                </div>
                <Card>
                    <div className="flex">
                        <div className="flex-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">
                                    Wallet Balance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-2xl font-bold">
                                        $
                                        <DataSkeleton
                                            as="span"
                                            placeholder="$100,000"
                                        >
                                            {/* {data?.walletBalance?.toFixed(2)} */}
                                            <Money
                                                noCurrency
                                                value={data?.walletBalance}
                                            />
                                        </DataSkeleton>
                                    </span>
                                </div>
                            </CardContent>
                        </div>
                        <div className="border-r"></div>

                        <div className="flex-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">
                                    Pending Payment
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-2xl font-bold">
                                        $
                                        <DataSkeleton
                                            as="span"
                                            placeholder="$100,000"
                                        >
                                            <Money
                                                noCurrency
                                                value={data?.pendingPayment}
                                            />
                                        </DataSkeleton>
                                    </span>
                                </div>
                            </CardContent>
                        </div>
                    </div>
                </Card>
                {!data?.pendingPayment || (
                    <div>
                        <Button
                            className="w-full"
                            onClick={(e) => {
                                query.setParams({
                                    tab: "pay-portal",
                                });
                            }}
                        >
                            Apply Payment
                        </Button>
                    </div>
                )}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            Recent Transactions
                        </CardTitle>
                        <CardDescription>Last 5 transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!skel.loading && !skel.data?.recentTx?.length ? (
                            <>
                                <div className="flex h-40 items-center justify-center">
                                    <p className="text-muted-foreground">
                                        No customer transaction data available
                                    </p>
                                </div>
                            </>
                        ) : (
                            <Table className="table-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead
                                            align="right"
                                            className="text-right"
                                        >
                                            Amount
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {skel
                                        .renderList(data?.recentTx)
                                        .map((tx, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <DataSkeleton pok="date">
                                                        {formatDate(
                                                            tx?.createdAt,
                                                        )}
                                                    </DataSkeleton>
                                                </TableCell>
                                                <TableCell>
                                                    <DataSkeleton pok="textSm">
                                                        {tx?.description}
                                                    </DataSkeleton>
                                                    <DataSkeleton pok="textSm">
                                                        {tx?.paymentMethod}
                                                    </DataSkeleton>
                                                </TableCell>
                                                <TableCell align="right">
                                                    $
                                                    <DataSkeleton
                                                        as="span"
                                                        pok="moneyLarge"
                                                    >
                                                        {formatMoney(
                                                            tx?.amount,
                                                        )}
                                                    </DataSkeleton>
                                                </TableCell>
                                                <TableCell>
                                                    <DataSkeleton
                                                        as="span"
                                                        pok="textSm"
                                                    >
                                                        <ProgressStatus
                                                            status={tx?.status}
                                                        />
                                                    </DataSkeleton>
                                                </TableCell>
                                                <TableCell>
                                                    <DataSkeleton
                                                        placeholder={"BTN"}
                                                    >
                                                        <DeleteCustomerTxBtn
                                                            transactionId={
                                                                tx?.id
                                                            }
                                                        />
                                                    </DataSkeleton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            Recent Sales
                        </CardTitle>
                        <CardDescription>Last 5 orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SalesList data={skel.data?.recentSales} />
                    </CardContent>
                </Card>
                <Footer />
            </DataSkeletonProvider>
        </div>
    );
}
