import Link from "next/link";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { ExternalLink } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";

import { composeSalesUrl } from "../../../utils/sales-utils";
import { useSalesOverview } from "../overview-provider";
import { SalesItemStatus } from "../sales-item-status";

export function SalesGeneralOverview({}) {
    const { item, overview, ...ctx } = useSalesOverview();
    return (
        <>
            <dl>
                <DataLine
                    label="Order Id"
                    value={
                        <div className="inline-flex items-center gap-2">
                            <span>{item.orderId}</span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6"
                                asChild
                            >
                                <Link
                                    href={composeSalesUrl(item)}
                                    className="inline-flex gap-2"
                                    target="_blank"
                                >
                                    <span>Edit</span>
                                    <ExternalLink className="size-4 text-muted-foreground" />
                                </Link>
                            </Button>
                        </div>
                    }
                />
                <DataLine
                    label="Customer"
                    value={
                        <Button
                            size="sm"
                            disabled={!item.customerPhone}
                            className="h-6"
                            variant="destructive"
                            onClick={ctx.openCustomer}
                        >
                            {item.displayName}
                        </Button>

                        // <Link
                        //     href={`/sales-book/customer/${
                        //         item.customerPhone || item.customerId
                        //     }`}
                        //     target="_blank"
                        //     className="inline-flex gap-2 items-center hover:underline"
                        // >
                        //     <span>{item.displayName}</span>
                        //     <ExternalLink className="size-4 text-muted-foreground" />
                        // </Link>
                    }
                />
                {/* <DataLine label="Customer Name" value={item.displayName} />
                <DataLine label="Customer Phone" value={item.customerPhone} />
                <DataLine label="Customer Address" value={item.address} /> */}
                <DataLine label="Sales Rep" value={item.salesRep} />
                <DataLine label="P.O No." value={item.poNo} />
                <DataLine
                    label="Total Invoice"
                    value={
                        <TCell.Money
                            className="font-mono"
                            value={item.invoice.total}
                        />
                    }
                />
                {item.isQuote ? (
                    <></>
                ) : (
                    <>
                        <DataLine
                            label="Paid"
                            value={
                                <TCell.Money
                                    className="font-mono"
                                    value={item.invoice.paid}
                                />
                            }
                        />
                        <DataLine
                            label="Pending"
                            value={
                                <TCell.Money
                                    className="font-mono"
                                    value={item.invoice.pending}
                                />
                            }
                        />
                    </>
                )}
                <div className="grid grid-cols-2 gap-4 px-4 py-4 sm:px-8">
                    {[item?.addressData?.billing, item?.addressData?.shipping]
                        .filter(Boolean)
                        .map((address, index) => (
                            <div className="text-sm" key={index}>
                                <div>
                                    <Label>{address.title}</Label>
                                </div>
                                <DataLine.Icon
                                    icon="user"
                                    value={address.name}
                                />
                                <DataLine.Icon
                                    icon="phone"
                                    value={address.phone}
                                />
                                <DataLine.Icon
                                    icon="address"
                                    value={address.address}
                                />
                            </div>
                        ))}
                </div>
                {item.isQuote ? (
                    <></>
                ) : (
                    <div className="px-4 sm:px-8">
                        <SalesItemStatus
                            status={
                                overview?.stat?.calculatedStats?.prodAssigned ||
                                item.stats.prodAssigned
                            }
                            title="Assigned"
                        />
                        <SalesItemStatus
                            status={
                                overview?.stat?.calculatedStats
                                    ?.prodCompleted || item.stats.prodCompleted
                            }
                            title="Production Completed"
                        />
                        <SalesItemStatus
                            status={
                                overview?.stat?.calculatedStats
                                    ?.dispatchCompleted ||
                                item.stats.dispatchCompleted
                            }
                            title="Fulfilled"
                        />
                    </div>
                )}
            </dl>
        </>
    );
}
