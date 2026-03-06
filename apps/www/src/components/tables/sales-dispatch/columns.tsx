"use client";

import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@gnd/ui/custom/progress";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useState } from "react";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { toast } from "@gnd/ui/use-toast";
import { Menu } from "@gnd/ui/custom/menu";
import { salesDispatchStatus } from "@gnd/utils/constants";
import { getColorFromName } from "@/lib/color";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Card, CardContent, CardHeader } from "@gnd/ui/card";
import { Calendar, Clock, MapPin, Package, Phone, Truck } from "lucide-react";
import { useMutation } from "@gnd/ui/tanstack";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@gnd/ui/alert-dialog";

import { Avatar, AvatarFallback, AvatarImage } from "@gnd/ui/avatar";
import { getInitials } from "@/utils/format";
import { useTable } from "@gnd/ui/data-table";

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
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
    const [packedCount, setPackedCount] = useState<number>(0);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const statusUpdate = useMutation(
        trpc.dispatch.updateDispatchStatus.mutationOptions({
            onSuccess(data) {
                if ((data as any)?.confirmationRequired) {
                    setPackedCount((data as any)?.packedCount || 0);
                    setPendingCount((data as any)?.pendingCount || 0);
                    setCompletionDialogOpen(true);
                    return;
                }
                setStatus((data as any).newStatus);
                toast({
                    duration: 2000,
                    variant: "success",
                    description: "Dispatch status updated",
                    title: "Updated!",
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.assignedDispatch.pathKey(),
                });
            },
            onError(error) {
                toast({
                    duration: 3000,
                    variant: "error",
                    description: error.message || "Unable to update status",
                    title: "Update Failed",
                });
            },
        }),
    );
    const updateStatus = (newStatus: Item["status"], completionMode?) => {
        if (newStatus === status && !completionMode) return;
        statusUpdate.mutate({
            dispatchId: item.id,
            oldStatus: (status || "queue") as any,
            newStatus: (newStatus || "queue") as any,
            completionMode,
        });
    };

    return (
        <>
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
                            updateStatus(__status as Item["status"]);
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
            <AlertDialog
                open={completionDialogOpen}
                onOpenChange={setCompletionDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Complete Dispatch With Pending Packings
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Some items were not packed. Completing this without
                            packing will open back-order on the order.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setCompletionDialogOpen(false);
                                updateStatus("completed", "packed_only");
                            }}
                        >
                            Complete with packed ({packedCount} items)
                        </AlertDialogAction>
                        <AlertDialogAction
                            onClick={() => {
                                setCompletionDialogOpen(false);
                                updateStatus("completed", "complete_all");
                            }}
                        >
                            Complete all
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const dueDateUpdate = useMutation(
        trpc.dispatch.updateDispatchDueDate.mutationOptions({
            onSuccess() {
                toast({
                    duration: 2000,
                    variant: "success",
                    description: "Dispatch due date updated",
                    title: "Updated!",
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.index.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.assignedDispatch.pathKey(),
                });
            },
            onError(error) {
                toast({
                    duration: 3000,
                    variant: "error",
                    description: error.message || "Unable to update due date",
                    title: "Update Failed",
                });
            },
        }),
    );

    return (
        <TCell.Secondary className="font-mono$">
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
                            if (!e) return;
                            const newDueDate = new Date(e as any);
                            dueDateUpdate.mutate({
                                dispatchId: item.id,
                                oldDueDate: date ? new Date(date as any) : null,
                                newDueDate,
                            });
                            setDate(newDueDate as any);
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
        <div className="flex items-center justify-end">
            <ActionMenu item={item} />
        </div>
    );
}
const order: ColumnDef<Item> = {
    header: "Order",
    accessorKey: "order",
    cell: ({ row: { original: item } }) => (
        <div className="inline-flex gap-2 items-center">
            <TCell.Secondary className="font-mono$">
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
            <TCell.Secondary className="font-mono$">
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
    accessorKey: "driver",
    meta: {
        preventDefault: true,
    },

    cell: ({ row: { original: item } }) => {
        const ctx = useTable();
        const trpc = useTRPC();
        const queryClient = useQueryClient();
        const [selectedDriver, setSelectedDriver] = useState<any>(null);
        const [confirmOpen, setConfirmOpen] = useState(false);

        const updateDriver = useMutation(
            trpc.dispatch.updateDispatchDriver.mutationOptions({
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
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.assignedDispatch.pathKey(),
                });
            },
            onError(error) {
                toast({
                    duration: 3000,
                    variant: "error",
                    description: error.message || "Unable to assign driver",
                    title: "Update Failed",
                });
            },
            }),
        );
        const submitDriverUpdate = (driverId: number | null) => {
            if ((item?.driver as any)?.id === driverId) return;
            updateDriver.mutate({
                dispatchId: item.id,
                oldDriverId: (item?.driver as any)?.id || null,
                newDriverId: driverId,
            });
        };
        const addon: Addon = ctx?.addons;
        return (
            <>
                <Menu
                    Icon={null}
                    variant={!item?.driver?.name ? "secondary" : "link"}
                    label={item?.driver?.name || "Not Assigned"}
                >
                    {addon?.drivers?.map((driver) => (
                        <Menu.Item
                            onClick={(e) => {
                                if ((item?.driver as any)?.id) {
                                    setSelectedDriver(driver);
                                    setConfirmOpen(true);
                                    return;
                                }
                                submitDriverUpdate(driver.id);
                            }}
                            key={driver?.id}
                        >
                            <span className="uppercase">{driver?.name}</span>
                        </Menu.Item>
                    ))}
                </Menu>
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Reassign Dispatch Driver
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This dispatch already has an assigned driver.
                                Do you want to proceed with re-assignment?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    setConfirmOpen(false);
                                    submitDriverUpdate(selectedDriver?.id);
                                }}
                            >
                                Proceed
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        );
    },
};
const packingProgress: ColumnDef<Item> = {
    header: "Progress",
    accessorKey: "progress",
    cell: ({ row: { original: item } }) => {
        const completed = item?.statistic?.packed?.completed || 0;
        const assignmentTotal = item?.statistic?.assignment?.total || 0;
        const total = assignmentTotal > 0 ? assignmentTotal : completed;
        const pending = Math.max(total - completed, 0);
        const ratio = total <= 0 ? 0 : completed / total;
        const colorClass =
            ratio >= 1
                ? "text-green-600"
                : ratio > 0
                  ? "text-amber-600"
                  : "text-muted-foreground";

        return (
            <div className="w-36">
                <div className={`text-sm font-semibold ${colorClass}`}>
                    {completed}/{total} packed
                </div>
                <div className={`text-xs ${colorClass}`}>
                    {Math.round(ratio * 100)}% ({pending} pending)
                </div>
            </div>
        );
    },
};
export const driverColumns: ColumnDef<Item>[] = [
    schedule,
    order,
    orderDate,
    customer,
    packingProgress,
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
            return <Action driverMode item={item} />;
        },
    },
];
export const columns: ColumnDef<Item>[] = [
    schedule,
    order,
    orderDate,
    customer,
    assignedTo,
    packingProgress,
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
function ActionMenu({ item }: { item: Item }) {
    const ctx = useSalesOverviewQuery();
    return (
        <Menu>
            <Menu.Item
                onClick={(e) => {
                    ctx.openDispatch(item?.order?.orderId, item.id, "packing");
                }}
                icon="packingList"
            >
                Packing
            </Menu.Item>
            <Menu.Item
                icon="production"
                onClick={(e) => {
                    ctx.openDispatch(
                        item?.order?.orderId,
                        item.id,
                        "production",
                    );
                }}
            >
                Production
            </Menu.Item>
        </Menu>
    );
}
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

                        <ActionMenu item={dispatch} />
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
