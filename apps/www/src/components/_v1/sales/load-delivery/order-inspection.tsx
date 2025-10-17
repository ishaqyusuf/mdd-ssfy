import PageHeader from "@/components/_v1/page-header";
import { useDataPage } from "@/lib/data-page-context";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { ISalesOrder } from "@/types/sales";
import { UseFormReturn } from "react-hook-form";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { SalesDataPage, TruckLoaderForm } from "./load-delivery";

interface Props {
    form: UseFormReturn<TruckLoaderForm>;
    order: ISalesOrder;
}
export default function OrderInspection({ form, order }: Props) {
    const dataPage = useDataPage<SalesDataPage>();
    const action = dataPage?.data?.action; // != "ready-for-delivery";
    return (
        <div className="space-y-4">
            <PageHeader
                title={order?.orderId}
                subtitle={
                    <div>
                        {order?.shippingAddress?.name}
                        {" | "}
                        {order?.shippingAddress?.address1}
                    </div>
                }
            />
            {dataPage?.data?.action == "load" && (
                <div className="grid gap-2">
                    <Label>Truck Load Location</Label>
                    <Input
                        {...form.register(
                            `loader.${order.slug}.truckLoadLocation`,
                        )}
                    />
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="px-2">Items</TableHead>
                        <TableHead className="px-2">Qty</TableHead>
                        {action != "load" && (
                            <TableHead className="px-2">Load Qty</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order?.items?.map((item, i) => (
                        <BackOrderLine
                            action={action}
                            order={order}
                            key={i}
                            form={form}
                            item={item}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
export function BackOrderLine({ form, order, item, action }) {
    const baseKey = `loader.${order.slug}.loadedItems.${item.meta.uid}`;
    const checked = form.watch(`${baseKey}.checked`);
    const qty = form.watch(`${baseKey}.qty`);
    const loadQty = form.watch(`${baseKey}.loadQty`);
    return (
        <TableRow
            className={cn(
                loadQty > 0 && "bg-green-100 hover:bg-green-100",
                loadQty > qty && "bg-red-100 hover:bg-red-100",
                loadQty < qty && "bg-orange-100 hover:bg-orange-100",
            )}
            key={item.id}
        >
            <TableCell
                onClick={(e) => {
                    form.setValue(`${baseKey}.checked`, !checked);
                }}
                className={cn("cursor-pointer p-2 uppercase")}
            >
                <p className="text-primary">{item.description}</p>
            </TableCell>
            <TableCell className={"p-2"}>
                <p className="text-primary">{item.qty}</p>
            </TableCell>
            {action != "load" && (
                <TableCell className={"p-2"}>
                    {item.qty && (
                        <Input
                            type="number"
                            {...form.register(`${baseKey}.loadQty` as any)}
                            className="h-7 w-16"
                        />
                    )}
                </TableCell>
            )}
        </TableRow>
    );
}
