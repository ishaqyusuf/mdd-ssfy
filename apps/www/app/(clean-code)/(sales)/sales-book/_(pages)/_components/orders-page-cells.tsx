import ConfirmBtn from "@/components/_v1/confirm-btn";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { useTRContext } from "@/components/(clean-code)/data-table/use-data-table";
import { Menu } from "@/components/(clean-code)/menu";
import { Progress } from "@/components/(clean-code)/progress";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

import { GetSalesOrdersDta } from "../../../_common/data-access/sales-dta";
import { StickyNote } from "lucide-react";

export interface ItemProps {
    item: GetSalesOrdersDta["data"][number];
    itemIndex?;
}
export type SalesItemProp = ItemProps["item"];
function Date({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary className="font-mono">
                {item.salesDate}
            </TCell.Secondary>
        </TCell>
    );
}
function Order({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary className="whitespace-nowrap  inline-flex items-center gap-1">
                <span>{item.orderId}</span>{" "}
                {item.orderId
                    ?.toLocaleUpperCase()
                    ?.endsWith(item?.salesRepInitial) || (
                    <span>
                        <Badge className="font-mono" variant="secondary">
                            {item.salesRepInitial}
                        </Badge>
                    </span>
                )}
                {!item.noteCount || (
                    <Badge className="p-1 h-5" variant="secondary">
                        <StickyNote className="w-3 mr-1" />
                        <span className="">{item.noteCount}</span>
                    </Badge>
                )}
            </TCell.Secondary>
            {/* <TCell.Secondary>{item.salesDate}</TCell.Secondary> */}
        </TCell>
    );
}
function Customer({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Primary
                className={cn(
                    item.isBusiness && "text-blue-700",
                    "whitespace-nowrap uppercase",
                )}
            >
                <TextWithTooltip
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item.displayName || "-"}
                />
            </TCell.Primary>
            {/* <TCell.Secondary>{item.customerPhone}</TCell.Secondary> */}
        </TCell>
    );
}
function CustomerPhone({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary className="whitespace-nowrap">
                <TextWithTooltip
                    className="max-w-[85px] xl:max-w-[120px]"
                    text={item.customerPhone || "-"}
                />
            </TCell.Secondary>
        </TCell>
    );
}
function Address({ item }: ItemProps) {
    const rowCtx = useTRContext();
    return (
        <TCell>
            <TCell.Secondary>
                <TextWithTooltip
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item.address}
                />
            </TCell.Secondary>
        </TCell>
    );
}
function SalesRep({ item }: ItemProps) {
    return (
        <TCell>
            <TCell.Secondary className="whitespace-nowrap uppercase">
                <TextWithTooltip
                    className="max-w-[85px]"
                    text={item.salesRep}
                />
            </TCell.Secondary>
        </TCell>
    );
}
function Production({ item }: ItemProps) {
    return (
        <TCell>
            <Progress>
                <Progress.Status
                    color={
                        item.status.production?.color ||
                        item.status.production?.color
                    }
                >
                    {item.status.production?.scoreStatus ||
                        item.status.production?.status}
                </Progress.Status>
            </Progress>
        </TCell>
    );
}
function Delivery({ item }: ItemProps) {
    return (
        <TCell>
            <Progress>
                <Progress.Status
                    color={
                        item.status.delivery?.color ||
                        item.status.delivery?.color
                    }
                >
                    {item.status.delivery?.scoreStatus ||
                        item.status.delivery?.status}
                </Progress.Status>
                <TCell.Secondary>{/* {item.status.date} */}</TCell.Secondary>
            </Progress>
        </TCell>
    );
}
function Dispatch({ item }: ItemProps) {
    //  const []
    const { theme } = useTheme();
    return (
        <TCell>
            <Progress.Status>
                {item.deliveryOption || "Not set"}
            </Progress.Status>
        </TCell>
    );
}
function Invoice({ item }: ItemProps) {
    const invoice = item.invoice;

    return (
        <TCell align="right">
            <TCell.Money value={invoice.total} className={cn("font-mono")} />

            {/* <TCell.Primary>
                    <TCell.Money
                        value={invoice.pending}
                        className={cn(
                            "hidden",
                            invoice.pending &&
                                invoice.pending != invoice.total &&
                                "  text-green-700/70 ",
                            invoice.pending &&
                                invoice.pending != invoice.total &&
                                "  text-red-700/70 block"
                        )}
                    />
                </TCell.Primary> */}
        </TCell>
    );
}
function Po({ item }: ItemProps) {
    // if (!item.poNo) return null;
    return (
        <TCell>
            <div>{item.poNo}</div>
        </TCell>
    );
}
function InvoicePending({ item }: ItemProps) {
    const invoice = item.invoice;
    const { theme } = useTheme();
    return (
        <TCell>
            <TCell.Money
                value={Math.abs(invoice.pending || 0)}
                className={cn(
                    "font-mono font-medium text-muted-foreground",
                    invoice.pending > 0 && "text-red-700/80",
                    invoice.pending < 0 && "bg-emerald-700 text-white",
                )}
            />
        </TCell>
    );
}
function Action({ item }: ItemProps) {
    return (
        <>
            <ConfirmBtn trash size="icon" variant="ghost" />
            {/* <div>a</div>
            <div>a</div> */}
        </>
    );
}
export let OrderCells = {
    Action,
    Order,
    Po,
    Customer,
    Address,
    SalesRep,
    Invoice,
    Date,
    Production,
    Delivery,
    Dispatch,
    CustomerPhone,
    InvoicePending,
};
