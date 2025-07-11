"use client";

import { ColumnDef, PageItemData } from "@/types/type";
import { _perm } from "@/components/sidebar/links";
import { getSalesResolutions } from "@/actions/get-sales-resolutions";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    DollarSign,
    User,
} from "lucide-react";
import { CardHeader, CardTitle } from "@gnd/ui/card";
import Money from "../_v1/money";
import { Badge } from "@gnd/ui/badge";
import { SalesData } from "./sales-data";
import { Menu } from "../(clean-code)/menu";
import { useAction } from "next-safe-action/hooks";
import { salesResolveUpdatePaymentAction } from "@/actions/sales-resolve-update-payment";
import { Progress } from "../(clean-code)/progress";
import { generateRandomString } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { Env } from "@/components/env";
import { isProdClient } from "@/lib/is-prod";

export type Item = PageItemData<typeof getSalesResolutions>;
export const columns: ColumnDef<Item>[] = [
    {
        header: "data",
        accessorKey: "data",
        meta: {
            className: "hover:bg-transparent p-0",
        },
        cell: ({ row: { original: item } }) => <Content item={item} />,
    },
];
function Content({ item: sale }: { item: Item }) {
    const { params, setParams } = useResolutionCenterParams();
    const ids = params?.resolutionIds || [];

    const salesOverview = useSalesOverviewQuery();
    const customerQuery = useCustomerOverviewQuery();
    return (
        <div className="border-red-200 bg-red-50/50">
            <Collapsible
                open={ids.includes(sale.id)}
                onOpenChange={() => {
                    let resolutionIds = [...ids];
                    if (resolutionIds.includes(sale.id))
                        resolutionIds = resolutionIds.filter(
                            (a) => a != sale.id,
                        );
                    else resolutionIds.push(sale.id);
                    if (!resolutionIds.length) resolutionIds = null;
                    setParams({
                        resolutionIds,
                    });
                }}
            >
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {ids.includes(sale.id) ? (
                                    <ChevronDown className="h-5 w-5" />
                                ) : (
                                    <ChevronRight className="h-5 w-5" />
                                )}
                                <div>
                                    <CardTitle className="text-lg uppercase">
                                        <Button
                                            size="xs"
                                            className="uppercase"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                salesOverview.open2(
                                                    sale?.orderId,
                                                    "sales",
                                                );
                                            }}
                                        >
                                            Order #{sale.orderId}
                                        </Button>
                                        {" - "}
                                        <Button
                                            size="xs"
                                            disabled={!sale?.accountNo}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // if (sale?.accountNo)
                                                customerQuery.open(
                                                    sale?.accountNo,
                                                );
                                            }}
                                            className="uppercase"
                                            variant="secondary"
                                        >
                                            {sale?.customer?.businessName ||
                                                sale?.customer?.name}
                                        </Button>
                                    </CardTitle>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                        <div className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            {sale.salesRep}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {sale.orderDate}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="h-4 w-4" />
                                            Total:
                                            <Money value={sale.total} />
                                        </div>
                                        <Env isDev>
                                            <div>{sale?.calculatedDue}</div>
                                            <div>{sale?.due}</div>
                                        </Env>
                                        {/* {sale.due > 0 && (
                                        <div className="flex items-center gap-1 text-red-600">
                                            <AlertTriangle className="h-4 w-4" />
                                            Due: $
                                            {sale.amountDue.toLocaleString()}
                                        </div>
                                    )} */}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {sale.status && (
                                    <Progress>
                                        <Progress.Status>
                                            {sale.status}
                                        </Progress.Status>
                                    </Progress>
                                )}
                                <Badge variant="outline" className="text-xs">
                                    {sale.paymentCount} Payment
                                    {sale.paymentCount !== 1 ? "s" : ""}
                                </Badge>

                                <Action item={sale} />
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SalesData sale={sale} />
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
function Action({ item: sale }: { item: Item }) {
    const rcp = useResolutionCenterParams();
    const updatePayment = useAction(salesResolveUpdatePaymentAction, {
        onSuccess(args) {
            rcp.setParams({
                refreshToken: generateRandomString(),
            });
        },
    });
    const UpdateAmountDue = (
        <Menu.Item
            disabled={updatePayment?.isExecuting}
            onClick={(e) => {
                e.preventDefault();
                updatePayment.execute({
                    salesId: sale.id,
                });
            }}
            icon="pendingPayment"
        >
            Calculate due amount
        </Menu.Item>
    );

    return (
        <Menu disabled={updatePayment?.isExecuting} label="Resolve" noSize>
            {UpdateAmountDue}
            <Menu.Item
                onClick={(e) => {
                    // updatePayment.execute({
                    //     salesId: sale.id,
                    // });
                }}
                SubMenu={
                    <>
                        <Menu.Item icon="wallet">Wallet</Menu.Item>
                        <Menu.Item icon="cash">Cash</Menu.Item>
                    </>
                }
                disabled={sale?.calculatedDue >= 0 || isProdClient}
                icon="pendingPayment"
                shortCut={
                    <>
                        <Money value={sale?.calculatedDue} />
                    </>
                }
            >
                Refund
            </Menu.Item>
        </Menu>
    );
    // return (
    //     <>{item.due != item.calculatedDue && item.status && UpdateAmountDue}</>
    // );
}
