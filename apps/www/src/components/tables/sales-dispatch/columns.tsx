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
import { useTable } from "..";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import {
    Calendar,
    Clock,
    MapPin,
    MoreVertical,
    Package,
    Phone,
    Truck,
    User,
} from "lucide-react";
import { Badge } from "@gnd/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { getInitials } from "@/utils/format";

export type Item = RouterOutputs["dispatch"]["index"]["data"][number];
export type Addon = {
    drivers?: RouterOutputs["hrm"]["getEmployees"]["data"];
    driverMode?: boolean;
};
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
    cell: ({ row: { original: item } }) => {
        return <ScheduleDate item={item} editable />;
    },
};
function ScheduleDate({ item, editable }: { item: Item; editable?: boolean }) {
    const [date, setDate] = useState(item?.dueDate);
    const ctx = useTable();
    const addon: Addon = ctx?.addons;
    const driverMode = addon?.driverMode;
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
                {driverMode ? (
                    <>
                        {date ? (
                            <TCell.Date>{date}</TCell.Date>
                        ) : (
                            <>Date Not Set</>
                        )}
                    </>
                ) : (
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
                )}
            </div>
        </TCell.Secondary>
    );
}
function Action({ item, driverMode }: { item: Item; driverMode?: boolean }) {
    const { params, setParams } = useInboundStatusModal();
    const { setParams: setSalesPreviewParams } = useSalesPreview();
    const ctx = useSalesOverviewQuery();
    return (
        <ActionCell itemId={item.id}>
            <Button
                size="xs"
                onClick={(e) => {
                    ctx.openDispatch(item?.order?.orderId, item.id);
                }}
            >
                <Icons.Edit className="size-4" />
            </Button>
            <Menu>
                <Menu.Item>Packing</Menu.Item>
            </Menu>
        </ActionCell>
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
const orderDate: ColumnDef<Item> = {
    header: "Order Date",
    accessorKey: "orderDate",
    cell: ({ row: { original: item } }) => (
        <div className="inline-flex gap-2 items-center">
            <TCell.Secondary className="font-mono">
                <TCell.Date>{item?.order?.createdAt}</TCell.Date>
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
    meta: {
        preventDefault: true,
    },

    cell: ({ row: { original: item } }) => {
        const ctx = useTable();
        const trpc = useTRPC();
        const queryClient = useQueryClient();

        const deliveryUpdate = useSalesDeliveryUpdate({
            salesId: item?.order?.id,
            defaultOption: item?.deliveryMode,
            deliveryId: item?.id,
            onSuccess() {
                toast({
                    duration: 2000,
                    variant: "success",
                    description: "Dispatch Assigned",
                    title: "Updated!",
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
            },
        });
        const addon: Addon = ctx?.addons;
        return (
            <Menu
                Icon={null}
                variant={!item?.driver?.name ? "secondary" : "link"}
                label={item?.driver?.name || "Not Assigned"}
            >
                {addon?.drivers?.map((driver) => (
                    <Menu.Item
                        onClick={(e) => {
                            deliveryUpdate.update({
                                driverId: driver.id,
                            });
                        }}
                        key={driver?.id}
                    >
                        <span className="uppercase">{driver?.name}</span>
                    </Menu.Item>
                ))}
            </Menu>
        );
    },
};
export const driverColumns: ColumnDef<Item>[] = [
    schedule,
    order,
    orderDate,
    customer,
    status,
    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            const ctx = useSalesOverviewQuery();
            return (
                <ActionCell itemId={item.id}>
                    <Button
                        onClick={(e) => {
                            ctx.openDispatch(item?.order?.orderId, item.id);
                        }}
                    >
                        <Icons.Edit className="size-4" />
                    </Button>
                    {/* <Action item={item} /> */}
                </ActionCell>
            );
        },
    },
];
export const columns: ColumnDef<Item>[] = [
    schedule,
    order,
    orderDate,
    customer,
    assignedTo,
    status,
    {
        header: "",
        accessorKey: "actions",
        meta: {
            className: "flex-1",
        },
        cell: ({ row: { original: item } }) => <Action item={item} />,
    },
];

export const mobileColumn: ColumnDef<Item>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            const ctx = useSalesOverviewQuery();
            return <SalesItemCard item={item} />;
        },
    },
]; // SalesItemCard.tsx
export function SalesItemCard({ item: dispatch }: { item: Item }) {
    const ctx = useSalesOverviewQuery();

    return (
        <Card key={dispatch.id} className="shadow-sm border-0 px-2">
            <CardHeader className="pb-3 px-1">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                                {dispatch.order.orderId}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                {getDeliveryModeIcon(dispatch.deliveryMode)}
                                <span className="capitalize">
                                    {dispatch.deliveryMode}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                                Ordered {formatDate(dispatch.order.createdAt)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Progress>
                            <Progress.Status>{dispatch.status}</Progress.Status>
                        </Progress>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onClick={() => {
                                        //  handleMenuAction(
                                        //      dispatch.id,
                                        //      "set-schedule",
                                        //  );
                                    }}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Set Schedule Date
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        //   handleMenuAction(
                                        //       dispatch.id,
                                        //       "assign",
                                        //   );
                                    }}
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    Assign To
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        // handleMenuAction(
                                        //     dispatch.id,
                                        //     "update-status",
                                        // );
                                    }}
                                >
                                    <Package className="mr-2 h-4 w-4" />
                                    Update Status
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        //  handleMenuAction(
                                        //      dispatch.id,
                                        //      "preview",
                                        //  );
                                    }}
                                >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Preview
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0 px-1">
                <div className="space-y-3">
                    {/* Schedule Date */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                            Schedule Date
                        </span>
                        <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-accent-foreground" />
                            {formatDateTime(dispatch.dueDate)}
                        </div>
                    </div>

                    {/* Customer Information */}
                    <div className="bg-muted rounded-lg p-3">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                            {dispatch.deliveryMode === "pickup"
                                ? "Customer"
                                : "Ship To"}
                        </div>
                        <div className="space-y-1">
                            <div className="font-medium">
                                {dispatch.order.customer?.businessName ||
                                    dispatch.order.customer?.name}
                            </div>

                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {dispatch.order.customer?.phoneNo}
                            </div>
                            {dispatch.order?.shippingAddress && (
                                <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
                                    <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span className="leading-tight">
                                        {/* {dispatch.order.shippingAddress} */}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assigned Driver */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                            Assigned Driver
                        </span>
                        {dispatch.driver ? (
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    {/* <AvatarImage
                                        src={
                                            dispatch.driver.avatar ||
                                            "/placeholder.svg"
                                        }
                                    /> */}
                                    <AvatarFallback
                                        style={{
                                            backgroundColor: getColorFromName(
                                                getInitials(
                                                    dispatch?.driver?.name,
                                                ),
                                            ),
                                        }}
                                        className="text-xs text-accent"
                                    >
                                        {getInitials(dispatch?.driver?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm ">
                                    {dispatch.driver?.name}
                                </span>
                            </div>
                        ) : (
                            <Progress>
                                <Progress.Status noDot>
                                    Unassigned
                                </Progress.Status>
                            </Progress>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

const getDeliveryModeIcon = (mode: string) => {
    return mode === "pickup" ? (
        <Package className="h-3 w-3" />
    ) : (
        <Truck className="h-3 w-3" />
    );
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};
