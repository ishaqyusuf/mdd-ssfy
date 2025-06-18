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
import StatusBadge from "../_v1/status-badge";
import { Progress } from "../(clean-code)/progress";

export type Item = PageItemData<typeof getSalesResolutions>;
export const columns: ColumnDef<Item>[] = [
    {
        header: "data",
        accessorKey: "data",
        meta: {
            className: "hover:bg-transparent p-0",
        },
        cell: ({ row: { original: item } }) => <Action item={item} />,
    },
];
function Action({ item: sale }: { item: Item }) {
    const { params, setParams } = useResolutionCenterParams();
    const ids = params?.resolutionIds || [];
    const updatePayment = useAction(salesResolveUpdatePaymentAction, {
        onSuccess(args) {},
    });
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
                                        Order #{sale.orderId} -{" "}
                                        {sale?.customer?.businessName ||
                                            sale?.customer?.name}
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
                                <Menu
                                    disabled={updatePayment?.isExecuting}
                                    label="Resolve"
                                    noSize
                                >
                                    <Menu.Item
                                        onClick={(e) => {
 
                                            // updatePayment.execute({
                                            //     salesId: sale.id,
                                            // });
 
                                        }}
                                        icon="pendingPayment"
                                    >
                                        Update Payment
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={(e) => {
 
                                            // updatePayment.execute({
                                            //     salesId: sale.id,
                                            // });
 
                                        }}
                                        SubMenu={
                                            <>
                                                <Menu.Item icon="wallet">
                                                    Wallet
                                                </Menu.Item>
                                                <Menu.Item icon="cash">
                                                    Cash
                                                </Menu.Item>
                                            </>
                                        }
                                        disabled={sale?.calculatedDue >= 0}
                                        icon="pendingPayment"
                                    >
                                        Refund{" "}
                                        <Money value={sale?.calculatedDue} />
                                    </Menu.Item>
                                </Menu>
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
