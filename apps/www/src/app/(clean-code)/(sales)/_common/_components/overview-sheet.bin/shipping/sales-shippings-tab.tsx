import { useEffect, useState } from "react";
import Link from "@/components/link";
import { TableCell } from "@/app/_components/data-table/table-cells";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import StatusBadge from "@/components/_v1/status-badge";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { Table, TableBody, TableRow } from "@gnd/ui/table";

import { SalesShippingDto } from "../../../data-access/dto/sales-shipping-dto";
import { deleteSalesDispatchUseCase } from "../../../use-case/sales-dispatch-use-case";
import { GetSalesOverview } from "../../../use-case/sales-item-use-case";
import { useSalesOverview } from "../overview-provider";

export type ItemGroupType = GetSalesOverview["itemGroup"][number];
export type ItemType = ItemGroupType["items"][number];
export type ItemAssignment = ItemType["assignments"][number];
export type ItemAssignmentSubmission = ItemAssignment["submissions"][number];
type PillsType = ItemType["pills"];
type AnalyticsType = ItemType["analytics"];
export function SalesShippingTab({}) {
    const ctx = useSalesOverview();
    const [showDetails, setShowDetails] = useState({});
    function toggleDetail(id) {
        setShowDetails((val) => {
            return {
                ...val,
                [id]: !val[id],
            };
        });
    }
    useEffect(() => {
        if (ctx.loader.loadId == null) {
            ctx.loader.refresh();
            ctx.openShipping();
        }
        // ctx.load();
    }, []);
    return (
        <div>
            <div className="">
                <div>
                    {/* {ctx.overview?.shipping?.dispatchableItemList} */}
                </div>
            </div>
            {ctx.overview?.shipping?.list?.length == 0 ? (
                <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
                    <p className="text-muted-foreground">No shipping yet</p>
                    <Button
                        onClick={() => {
                            ctx.createShipping();
                        }}
                    >
                        Create Shipping
                    </Button>
                </div>
            ) : (
                <div className="flex gap-4 border-b p-2 sm:px-4">
                    <div className="flex-1"></div>
                    <Button variant="ghost" asChild size="sm" className="h-8">
                        <Link
                            href={`/printer/sales?slugs=${ctx?.overview?.orderId}&mode=packing list&dispatchId=all`}
                            target="_blank"
                        >
                            <Icons.print className="mr-2 size-4" />
                            <span>Print All</span>
                        </Link>
                    </Button>
                    <Button
                        onClick={() => {
                            ctx.createShipping();
                        }}
                        size="sm"
                        className="h-8"
                    >
                        <Icons.add className="mr-2 size-4" />
                        <span>Create</span>
                    </Button>
                </div>
            )}
            <Table>
                <TableBody>
                    {ctx.overview?.shipping?.list?.map((ls) => (
                        <ShippingRow shipping={ls} key={ls.id} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
function ShippingRow({
    shipping,
}: {
    shipping: SalesShippingDto["list"][number];
}) {
    const ctx = useSalesOverview();
    function openShipping() {
        ctx.viewShipping(shipping.id);
    }
    async function _deleteShipping() {
        await deleteSalesDispatchUseCase(shipping.id);
        ctx.refresh();
        toast.error("Deleted");
    }
    return (
        <TableRow className="cursor-pointer">
            <TableCell onClick={openShipping}>{shipping.date}</TableCell>
            <TableCell onClick={openShipping}>{shipping.title}</TableCell>
            <TableCell onClick={openShipping}>
                <StatusBadge status={shipping.status || "In Progress"} />
            </TableCell>
            <TableCell onClick={(e) => e.preventDefault()}>
                <ConfirmBtn onClick={_deleteShipping} trash size="icon" />
            </TableCell>
        </TableRow>
    );
}
interface LineItemProps {
    className?: string;
    item: ItemType;
    onClick?;
}
export function LineItem({ className = null, item, onClick }: LineItemProps) {
    const ctx = useSalesOverview();
    return (
        <div
            onClick={onClick}
            className={cn("my-3 border bg-white sm:rounded-lg", className)}
        >
            <div className="px-4 py-2">
                <div className="flex items-center">
                    <div className="flex-1 uppercase">{item.title}</div>
                    <div className="text-sm font-medium">
                        <Money value={item.total} />
                    </div>
                </div>
                <div className="flex justify-between">
                    <Pills item={item} />
                    <div className="flex-1"></div>
                </div>
            </div>
            {item.analytics?.info && (
                <div className="mt-1 flex justify-between border-t text-xs font-semibold uppercase text-muted-foreground">
                    {item.analytics?.info?.map((info, k) => (
                        <div className="p-2 px-4 text-start font-mono" key={k}>
                            {info.text}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
export function Details({ group, show }: { show; group: ItemGroupType }) {
    if (!show) return null;
    return (
        <div className="grid sm:-mx-8 sm:grid-cols-2 sm:gap-4">
            {group.style.map((style, id) => (
                <DataLine key={id} {...style} />
            ))}
        </div>
    );
}

function Pills({ item }: { item: ItemType }) {
    if (!item.pills.filter((p) => p.value).length) return null;
    return (
        <div className="my-1 flex space-x-4">
            {item.pills
                ?.filter((p) => p.value)
                .map((pill, id) => (
                    <div key={id}>
                        <Badge
                            className="font-mono text-xs uppercase"
                            variant="secondary"
                        >
                            {pill.text}
                        </Badge>
                    </div>
                ))}
        </div>
    );
}
