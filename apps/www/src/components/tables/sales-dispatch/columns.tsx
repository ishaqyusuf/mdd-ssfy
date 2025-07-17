"use client";

import { ColumnDef } from "@/types/type";
import { ActionCell } from "../action-cell";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@/components/(clean-code)/progress";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { Icons } from "@gnd/ui/icons";
import { Button } from "@gnd/ui/button";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useState } from "react";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { useSalesDeliveryUpdate } from "@/hooks/use-sales-delivery-update";
import { toast } from "@gnd/ui/use-toast";
import { Menu } from "@/components/(clean-code)/menu";
import { salesDispatchStatus } from "@gnd/utils/constants";
import { getColorFromName } from "@/lib/color";

export type Item = RouterOutputs["dispatch"]["index"]["data"][number];

const status: ColumnDef<Item> = {
    header: "Status",
    accessorKey: "status",
    meta: {
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => <Status item={item} />,
};
function Status({ item, admin }: { item: Item; admin?: boolean }) {
    const [status, setStatus] = useState(item.status);
    const deliveryUpdate = useSalesDeliveryUpdate({
        salesId: item?.order?.id,
        defaultOption: item?.deliveryMode,
        deliveryId: item?.id,
        onSuccess(data, variable, context) {
            toast({
                duration: 2000,
                variant: "success",
                description: "Dispatch status updated",
                title: "Updated!",
            });
            setStatus(variable.status);
        },
    });
    return (
        <Menu
            Icon={null}
            variant="link"
            label={
                <Progress>
                    <Progress.Status>{status || "N/A"}</Progress.Status>
                </Progress>
            }
        >
            {salesDispatchStatus.map((__status) => (
                <Menu.Item
                    onClick={(e) => {
                        deliveryUpdate.update({
                            status: __status,
                        });
                    }}
                    key={__status}
                >
                    <div
                        className="size-2"
                        style={{
                            backgroundColor: getColorFromName(__status),
                        }}
                    ></div>
                    <span className="uppercase">{__status}</span>
                </Menu.Item>
            ))}
        </Menu>
    );
}
const schedule: ColumnDef<Item> = {
    header: "Schedule",
    accessorKey: "salesDate",
    meta: {
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => (
        <ScheduleDate item={item} editable />
    ),
};
function ScheduleDate({ item, editable }: { item: Item; editable?: boolean }) {
    const [date, setDate] = useState(item?.dueDate);
    const deliveryUpdate = useSalesDeliveryUpdate({
        salesId: item?.order?.id,
        defaultOption: item?.deliveryMode,
        deliveryId: item?.id,
        onSuccess() {
            toast({
                duration: 2000,
                variant: "success",
                description: "Dispatch Date Updated",
                title: "Updated!",
            });
        },
    });
    return (
        <TCell.Secondary className="font-mono">
            <div className="w-32">
                <DatePicker
                    placeholder={`Not Set`}
                    hideIcon
                    value={date}
                    onSelect={(e) => {
                        deliveryUpdate.update({
                            date: e,
                        });
                    }}
                    variant="secondary"
                    className="w-auto"
                />
            </div>
        </TCell.Secondary>
    );
}
function Action({ item }: { item: Item }) {
    const { params, setParams } = useInboundStatusModal();
    const { setParams: setSalesPreviewParams } = useSalesPreview();
    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => {
                    // setParams({
                    //     inboundOrderId: item.id,
                    //     inboundOrderNo: item.orderId,
                    // });
                    // setSalesPreviewParams({
                    //     previewMode: "packing list",
                    //     salesPreviewSlug: item.orderId,
                    //     salesPreviewType: "order",
                    // });
                }}
            >
                <Icons.Edit className="h-4 w-4" />
            </Button>
        </>
    );
}
const order: ColumnDef<Item> = {
    header: "Order",
    accessorKey: "order",
    cell: ({ row: { original: item } }) => (
        <div className="inline-flex gap-2 items-center">
            <TCell.Secondary className="font-mono">
                {item?.order?.orderId}
            </TCell.Secondary>
        </div>
    ),
};
const customer: ColumnDef<Item> = {
    header: "Ship To",
    accessorKey: "customer",
    cell: ({ row: { original: item } }) => (
        <div className="inline-flex flex-col">
            <TCell.Primary className="uppercase">
                {item?.order?.shippingAddress?.name ||
                    item?.order?.customer?.businessName ||
                    item?.order?.customer?.name}
            </TCell.Primary>
            <span className="uppercase">
                {item?.order?.shippingAddress?.phoneNo ||
                    item?.order?.customer?.phoneNo}
            </span>
        </div>
    ),
};
const assignedTo: ColumnDef<Item> = {
    header: "Assigned To",
    accessorKey: "salesRep",
    cell: ({ row: { original: item } }) => (
        <div className="inline-flex flex-col">
            <span className="uppercase">{item?.driver?.name}</span>
        </div>
    ),
};
export const driverColumns: ColumnDef<Item>[] = [
    schedule,
    order,
    customer,
    assignedTo,
    status,
    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return (
                <ActionCell itemId={item.id}>
                    {/* <Action item={item} /> */}
                </ActionCell>
            );
        },
    },
];
export const columns: ColumnDef<Item>[] = [
    schedule,
    order,
    customer,
    assignedTo,
    status,
    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => {
            return (
                <ActionCell itemId={item.id}>
                    {/* <Action item={item} /> */}
                </ActionCell>
            );
        },
    },
];
