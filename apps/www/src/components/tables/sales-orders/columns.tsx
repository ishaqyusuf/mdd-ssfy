"use client";

import * as React from "react";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Progress } from "@gnd/ui/custom/progress";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { buttonVariants } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { InvoiceColumn } from "./column.invoice";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Item } from "@gnd/ui/namespace";

import Link from "next/link";
import { SalesMenu } from "@/components/sales-menu";
import { SuperAdminGuard } from "@/components/auth-guard";
import { useBin } from "@/hooks/use-bin";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { useDriversList } from "@/hooks/use-data-list";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { UpdateSalesControl } from "@sales/schema";
import { toast } from "@gnd/ui/use-toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { DeliveryOption } from "@/types/sales";
import {
    FulfillmentCompleteModal,
    FulfillmentDispatch,
} from "./fulfillment-complete-modal";
export type SalesOrderItem = RouterOutputs["sales"]["index"]["data"][number];
interface ItemProps {
    item: SalesOrderItem;
}

function getProductionStatusLabel(item: SalesOrderItem) {
    const status = (item as any)?.control?.productionStatus;
    if (status && status !== "unknown") return status;
    return (
        item.status.production?.scoreStatus || item.status.production?.status
    );
}

function getFulfillmentStatusLabel(item: SalesOrderItem) {
    const status = (item as any)?.control?.dispatchStatus;
    if (status && status !== "unknown") return status;
    return item?.deliveryStatus || "-";
}

function CompactCustomerCell({ item }: { item: SalesOrderItem }) {
    return (
        <div className="max-w-[220px] xl:max-w-[300px]">
            <Item.Title
                className={cn(
                    "flex max-w-[220px] items-center gap-1 xl:max-w-[300px]",
                    item.isBusiness && "text-blue-700",
                )}
            >
                <TextWithTooltip
                    className="max-w-[120px] truncate xl:max-w-[160px]"
                    text={item.displayName || "-"}
                />
                <span className="font-normal text-muted-foreground">
                    {" - "}
                    {item.customerPhone || "-"}
                </span>
            </Item.Title>
            <Item.Description>
                <TextWithTooltip
                    className="min-w-max max-w-[220px] truncate"
                    text={item.address || "no address"}
                />
            </Item.Description>
        </div>
    );
}

const compactCustomerV2 = true;
const compactCustomer = false;

const compactCustomerColumnV2: ColumnDef<SalesOrderItem>[] = [
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <CompactCustomerCell item={item} />
        ),
    },
];

const legacyCustomerColumnsV2: ColumnDef<SalesOrderItem>[] = [
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <TCell.Primary
                className={cn(
                    item.isBusiness && "text-blue-700",
                    "whitespace-nowrap uppercase",
                )}
            >
                <TextWithTooltip
                    className="w-[100px] xl:w-[150px] max-w-none"
                    text={item.displayName || "-"}
                />
            </TCell.Primary>
        ),
    },
    {
        header: "Phone",
        accessorKey: "phone",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap">
                <TextWithTooltip
                    className="w-[110px]"
                    text={item?.customerPhone?.trim() || "-"}
                />
            </TCell.Secondary>
        ),
    },
    {
        header: "Address",
        accessorKey: "address",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary>
                <TextWithTooltip
                    className="w-[100px] xl:w-[120px] 2xl:w-[160px] max-w-none"
                    text={item?.address}
                />
            </TCell.Secondary>
        ),
    },
];

const compactCustomerColumn: ColumnDef<SalesOrderItem>[] = [
    {
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row: { original: item } }) => (
            <CompactCustomerCell item={item} />
        ),
    },
];

const legacyCustomerColumns: ColumnDef<SalesOrderItem>[] =
    legacyCustomerColumnsV2;

export const columns2: ColumnDef<SalesOrderItem>[] = [
    cells.selectColumn,
    {
        header: "Date",
        accessorKey: "salesDate",
        meta: {},
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono$">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Order #",
        accessorKey: "orderNo",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap inline-flex items-center gap-1">
                <span>{item.orderId}</span>
                {!item.orderId
                    ?.toUpperCase()
                    .endsWith(item.salesRepInitial) && (
                    <Badge className="font-mono$" variant="secondary">
                        {item.salesRepInitial}
                    </Badge>
                )}
                {!item.noteCount || (
                    <Badge className="p-1 h-5" variant="secondary">
                        <Icons.StickyNote className="w-3 mr-1" />
                        <span className="">{item.noteCount}</span>
                    </Badge>
                )}
            </TCell.Secondary>
        ),
    },
    {
        header: "P.O",
        accessorKey: "po",
        meta: {
            className: "",
        },
        cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
    },
    // Toggle this switch to restore the legacy separate Customer / Phone / Address columns.
    ...(compactCustomerV2 ? compactCustomerColumnV2 : legacyCustomerColumnsV2),
    {
        header: "Invoice",
        accessorKey: "invoice",
        meta: {
            className: "text-right",
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            return <InvoiceColumn item={item} />;
        },
    },
    {
        header: "Method",
        id: "deliveryMethod",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>
                {item?.deliveryOption || "Not set"}
            </Progress.Status>
        ),
    },
    {
        header: "Production",
        accessorKey: "production",
        cell: ({ row: { original: item } }) => (
            <Progress>
                <Progress.Status>
                    {getProductionStatusLabel(item)}
                </Progress.Status>
            </Progress>
        ),
    },
    {
        header: "Fulfillment",
        id: "fulfillmentStatus",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>{getFulfillmentStatusLabel(item)}</Progress.Status>
        ),
    },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Actions item={item} />
            </>
        ),
    },
];
export const columns: ColumnDef<SalesOrderItem>[] = [
    cells.selectColumn,
    {
        header: "Date",
        accessorKey: "salesDate",
        meta: {},
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="font-mono$">
                {item?.salesDate}
            </TCell.Secondary>
        ),
    },
    {
        header: "Order #",
        accessorKey: "orderNo",
        cell: ({ row: { original: item } }) => (
            <TCell.Secondary className="whitespace-nowrap inline-flex items-center gap-1">
                <span>{item.orderId}</span>
                {!item.orderId
                    ?.toUpperCase()
                    .endsWith(item.salesRepInitial) && (
                    <Badge className="font-mono$" variant="secondary">
                        {item.salesRepInitial}
                    </Badge>
                )}
                {!item.noteCount || (
                    <Badge className="p-1 h-5" variant="secondary">
                        <Icons.StickyNote className="w-3 mr-1" />
                        <span className="">{item.noteCount}</span>
                    </Badge>
                )}
            </TCell.Secondary>
        ),
    },
    {
        header: "P.O",
        accessorKey: "po",
        meta: {
            className: "",
        },
        cell: ({ row: { original: item } }) => <div>{item?.poNo}</div>,
    },
    // Toggle this switch to restore the legacy separate Customer / Phone / Address columns.
    ...(compactCustomer ? compactCustomerColumn : legacyCustomerColumns),
    // {
    //     header: "Invoice",
    //     accessorKey: "invoice",
    //     meta: {
    //         className: "text-right",
    //     },
    //     cell: ({ row: { original: item } }) => (
    //         <div className="text-right">
    //             <TCell.Money
    //                 value={item.invoice.total}
    //                 className={cn("font-mono$")}
    //             />
    //         </div>
    //     ),
    // },
    {
        header: "Invoice",
        accessorKey: "invoice",
        meta: {
            className: "text-right",
            preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            return <InvoiceColumn item={item} />;
        },
    },

    {
        header: "Method",
        id: "deliveryMethod",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>
                {item?.deliveryOption || "Not set"}
            </Progress.Status>
        ),
    },
    {
        header: "Production",
        accessorKey: "production",
        cell: ({ row: { original: item } }) => (
            <Progress>
                <Progress.Status>
                    {getProductionStatusLabel(item)}
                </Progress.Status>
            </Progress>
        ),
    },
    {
        header: "Fulfillment",
        id: "fulfillmentStatus",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>{getFulfillmentStatusLabel(item)}</Progress.Status>
        ),
    },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "dt-action-cell",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Actions item={item} />
            </>
        ),
    },
];

function Actions({ item }: { item: SalesOrderItem }) {
    const overviewOpen = useSalesOverviewOpen();
    const produceable = !!item.stats?.prodCompleted?.total;
    const productionStatus = String(
        (item as any)?.control?.productionStatus ||
            item?.status?.production?.status ||
            "",
    ).toLowerCase();
    const hasPendingProduction = ["pending", "in progress"].includes(
        productionStatus,
    );
    const isFulfillmentCompleted = [
        (item as any)?.control?.dispatchStatus,
        item?.deliveryStatus,
        (item as any)?.status?.delivery?.status,
    ]
        .filter(Boolean)
        .some((status) => String(status).toLowerCase() === "completed");
    const isBin = useBin();
    const auth = useAuth();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [isFulfillmentModalOpen, setFulfillmentModalOpen] =
        React.useState(false);
    const notification = useNotificationTrigger({ silent: true });
    const { trigger } = useTaskTrigger({
        silent: true,
        onSuccess() {
            invalidateInfiniteQueries("sales.getOrders");
            toast({
                title: "Updated sales order.",
                description: `Sales order ${item.orderId} has been updated.`,
                variant: "success",
            });
        },
    });
    const drivers = useDriversList(isFulfillmentModalOpen);
    const dispatchOverview = useQuery(
        trpc.dispatch.orderDispatchOverview.queryOptions(
            {
                salesId: item.id,
            },
            {
                enabled: isFulfillmentModalOpen,
            },
        ),
    );
    const dispatches = (dispatchOverview.data?.deliveries ||
        []) as FulfillmentDispatch[];
    const { mutateAsync: createDispatch, isPending: isCreatingDispatch } =
        useMutation(
            trpc.dispatch.createDispatch.mutationOptions({
                onSuccess() {
                    invalidateInfiniteQueries("sales.getOrders");
                },
            }),
        );
    const { mutateAsync: submitDispatch, isPending: isSubmittingDispatch } =
        useMutation(
            trpc.dispatch.submitDispatch.mutationOptions({
                onSuccess() {
                    invalidateInfiniteQueries("sales.getOrders");
                },
            }),
        );
    const { mutateAsync: updateDispatchDriver, isPending: isUpdatingDriver } =
        useMutation(
            trpc.dispatch.updateDispatchDriver.mutationOptions({
                onSuccess() {
                    invalidateInfiniteQueries("sales.getOrders");
                },
            }),
        );
    const {
        mutateAsync: updateSalesDeliveryOption,
        isPending: isUpdatingDeliveryOption,
    } = useMutation(
        trpc.dispatch.updateSalesDeliveryOption.mutationOptions({
            onSuccess() {
                invalidateInfiniteQueries("sales.getOrders");
            },
        }),
    );
    const {
        mutate: deleteDispatch,
        isPending: isDeletingDispatch,
        variables: deletingDispatchVars,
    } = useMutation(
        trpc.dispatch.deleteDispatch.mutationOptions({
            onSuccess() {
                dispatchOverview.refetch();
                invalidateInfiniteQueries("sales.getOrders");
            },
            onError(error) {
                toast({
                    title: "Unable to delete dispatch.",
                    description: error.message || "Please try again.",
                    variant: "error",
                });
            },
        }),
    );
    const getMeta = () => ({
        salesId: item.id,
        authorId: Number(auth?.id || 0),
        authorName: auth?.name || "System",
    });
    const deletingDispatchId =
        deletingDispatchVars && "dispatchId" in deletingDispatchVars
            ? Number(deletingDispatchVars.dispatchId)
            : null;
    const triggerProductionComplete = () => {
        toast({
            title: "Updating production status...",
            description: `Marking production as complete for order ${item.orderId}.`,
            variant: "spinner",
        });
        const payload: UpdateSalesControl = {
            meta: getMeta(),
            submitAll: {},
        };
        trigger({
            taskName: "update-sales-control",
            payload,
        });
        notification.send("sales_marked_as_production_completed", {
            payload: {
                salesId: item.id,
                orderNo: item.orderId || undefined,
            },
            author: {
                id: Number(auth?.id || 0),
                role: "employee",
            },
        });
    };

    const handleFulfillmentConfirm = async (payload: {
        selectedDispatchId: number | null;
        createNew: boolean;
        completionMode: "pending_packing" | "pack_all";
        deliveryMode: DeliveryOption;
        recipient: string;
        completedDate: Date;
        driverId: number | null;
    }) => {
        if (hasPendingProduction) {
            toast({
                title: "Production pending",
                description:
                    "Fulfillment cannot be completed while production is still pending.",
                variant: "error",
            });
            return;
        }
        toast({
            title: "Updating fulfillment...",
            description: `Marking fulfillment as complete for order ${item.orderId}.`,
            variant: "spinner",
        });

        try {
            let dispatchId = payload.selectedDispatchId;
            const selectedDispatch = dispatches.find(
                (dispatch) => dispatch.id === dispatchId,
            );
            const selectedDeliveryMode =
                payload.deliveryMode || item.deliveryOption || "delivery";
            const driverId =
                selectedDeliveryMode === "pickup" ? null : payload.driverId;

            if (selectedDeliveryMode !== item.deliveryOption) {
                await updateSalesDeliveryOption({
                    salesId: item.id,
                    option: selectedDeliveryMode,
                });
            }

            if (payload.createNew || !dispatchId) {
                const createdDispatch = await createDispatch({
                    salesId: item.id,
                    deliveryMode: selectedDeliveryMode,
                    dueDate: payload.completedDate || new Date(),
                    driverId: driverId || undefined,
                    status: "queue",
                });
                dispatchId = createdDispatch.id;
            } else if (
                selectedDispatch &&
                selectedDeliveryMode !== selectedDispatch.deliveryMode
            ) {
                await updateSalesDeliveryOption({
                    salesId: item.id,
                    deliveryId: selectedDispatch.id,
                    option: selectedDeliveryMode,
                });
            }

            if (
                selectedDispatch &&
                driverId !== (selectedDispatch.driverId ?? null)
            ) {
                await updateDispatchDriver({
                    dispatchId: selectedDispatch.id,
                    oldDriverId: selectedDispatch.driverId ?? null,
                    newDriverId: driverId ?? null,
                });
            }

            if (!dispatchId) {
                throw new Error("Dispatch is required.");
            }

            if (payload.completionMode === "pack_all") {
                const packAllPayload: UpdateSalesControl = {
                    meta: getMeta(),
                    packItems: {
                        dispatchId,
                        dispatchStatus: "completed",
                        packMode: "all",
                        replaceExisting: true,
                    },
                };
                trigger({
                    taskName: "update-sales-control",
                    payload: packAllPayload,
                });
            }

            await submitDispatch({
                meta: getMeta(),
                submitDispatch: {
                    dispatchId,
                    receivedBy:
                        payload.recipient ||
                        item?.addressData?.shipping?.name ||
                        "Customer",
                    receivedDate: payload.completedDate || new Date(),
                },
            });

            setFulfillmentModalOpen(false);
            queryClient.invalidateQueries({
                queryKey: trpc.dispatch.orderDispatchOverview.queryKey({
                    salesId: item.id,
                }),
            });
        } catch (error: any) {
            toast({
                title: "Unable to complete fulfillment.",
                description: error?.message || "Please try again.",
                variant: "error",
            });
        }
    };
    const { mutate: restore, isPending: isRestoring } = useMutation(
        trpc.sales.restore.mutationOptions({
            onSuccess: () => {
                invalidateInfiniteQueries("sales.getOrders");
            },
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        }),
    );
    if (isBin) {
        return (
            <>
                <SubmitButton
                    type="button"
                    onClick={(e) => {
                        restore({ salesId: item.id });
                    }}
                    isSubmitting={isRestoring}
                    size="sm"
                    variant="destructive"
                >
                    Restore
                </SubmitButton>
            </>
        );
    }
    return (
        <div className="relative flex items-center gap-2 z-10">
            <Link
                className={cn(
                    buttonVariants({
                        // variant: "ghost"
                        size: "xs",
                    }),
                    "bg-green-600/70 hover:bg-green-600 text-accent",
                )}
                href={`/sales-book/edit-order/${item.slug}`}
            >
                <Icons.Edit className="size-4" />
            </Link>
            <SalesMenu
                id={item.id}
                slug={item.slug}
                type="order"
                trigger={
                    <Button size="xs" variant="outline">
                        <Icons.MoreHoriz className="size-4 text-muted-foreground" />
                    </Button>
                }
            >
                <SuperAdminGuard>
                    <SalesMenu.Sub>
                        <SalesMenu.SubTrigger className="whitespace-nowrap">
                            <Icons.ExternalLink className="mr-2 size-4 text-muted-foreground/70" />
                            <span className="whitespace-nowrap">
                                Open overview
                            </span>
                            <span className="ml-auto rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                v2
                            </span>
                        </SalesMenu.SubTrigger>
                        <SalesMenu.SubContent>
                            <SalesMenu.Item
                                className="whitespace-nowrap"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    overviewOpen.openSalesAdminSheet(item.uuid);
                                }}
                            >
                                Open v2 sheet
                            </SalesMenu.Item>
                            <SalesMenu.Item
                                className="whitespace-nowrap"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    overviewOpen.openSalesAdminPage(item.uuid);
                                }}
                            >
                                Open v2 page
                            </SalesMenu.Item>
                        </SalesMenu.SubContent>
                    </SalesMenu.Sub>
                </SuperAdminGuard>
                <SalesMenu.SalesPrintMenuItems />
                <SuperAdminGuard>
                    <SalesMenu.PrintModes />
                </SuperAdminGuard>
                <SalesMenu.Sub>
                    <SalesMenu.SubTrigger>
                        <Icons.Check className="mr-2 size-4 text-muted-foreground/70" />
                        Mark as
                    </SalesMenu.SubTrigger>
                    <SalesMenu.SubContent>
                        <SalesMenu.Item
                            disabled={!produceable}
                            onSelect={(e) => {
                                e.preventDefault();
                                triggerProductionComplete();
                            }}
                        >
                            <Icons.Check className="mr-2 size-4 text-muted-foreground/70" />
                            Production Complete
                        </SalesMenu.Item>
                        <SalesMenu.Item
                            disabled={
                                isFulfillmentCompleted || hasPendingProduction
                            }
                            onSelect={(e) => {
                                e.preventDefault();
                                if (
                                    isFulfillmentCompleted ||
                                    hasPendingProduction
                                ) {
                                    if (hasPendingProduction) {
                                        toast({
                                            title: "Production pending",
                                            description:
                                                "Fulfillment cannot be completed while production is still pending.",
                                            variant: "error",
                                        });
                                    }
                                    return;
                                }
                                setFulfillmentModalOpen(true);
                            }}
                        >
                            <Icons.Check className="mr-2 size-4 text-muted-foreground/70" />
                            Fulfillment Complete
                        </SalesMenu.Item>
                    </SalesMenu.SubContent>
                </SalesMenu.Sub>
            </SalesMenu>
            <FulfillmentCompleteModal
                open={isFulfillmentModalOpen}
                onOpenChange={setFulfillmentModalOpen}
                dispatches={dispatches}
                drivers={(drivers || []).map((driver: any) => ({
                    id: Number(driver.id),
                    name: driver.name,
                }))}
                defaultRecipient={
                    item?.addressData?.shipping?.name ||
                    item.displayName ||
                    "Customer"
                }
                defaultDeliveryMode={
                    (item.deliveryOption as DeliveryOption) || "delivery"
                }
                isLoading={
                    dispatchOverview.isLoading || dispatchOverview.isFetching
                }
                isSubmitting={
                    isCreatingDispatch ||
                    isSubmittingDispatch ||
                    isUpdatingDriver ||
                    isUpdatingDeliveryOption ||
                    isDeletingDispatch
                }
                deletingDispatchId={deletingDispatchId}
                onDeleteDispatch={(dispatchId) => {
                    deleteDispatch({ dispatchId });
                }}
                onConfirm={handleFulfillmentConfirm}
            />
        </div>
    );
}
export const mobileColumn: ColumnDef<SalesOrderItem>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
        },
        cell: ({ row: { original: item } }) => {
            return <ItemCard item={item} />;
        },
    },
];
function ItemCard({ item }: ItemProps) {
    return (
        <div className="flex flex-col space-y-2 p-3">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <TCell.Secondary className="font-bold">
                            {item.orderId}
                        </TCell.Secondary>
                        {!item.orderId
                            ?.toUpperCase()
                            .endsWith(item.salesRepInitial) && (
                            <Badge
                                className="font-mono$ text-xs"
                                variant="secondary"
                            >
                                {item.salesRepInitial}
                            </Badge>
                        )}
                        {!item.noteCount || (
                            <Badge
                                className="p-1 h-5 text-xs"
                                variant="secondary"
                            >
                                <Icons.StickyNote className="w-3 mr-1" />
                                <span>{item.noteCount}</span>
                            </Badge>
                        )}
                    </div>
                    <TCell.Secondary className="text-xs font-mono$">
                        {item?.salesDate}
                    </TCell.Secondary>
                </div>
            </div>

            <div>
                <TCell.Primary
                    className={cn(
                        "font-semibold",
                        item.isBusiness && "text-blue-700",
                    )}
                >
                    <TextWithTooltip
                        className="max-w-full"
                        text={item.displayName || "-"}
                    />
                </TCell.Primary>
                {item.poNo && (
                    <TCell.Secondary className="text-xs">
                        P.O: {item.poNo}
                    </TCell.Secondary>
                )}
            </div>

            <div className="text-xs text-muted-foreground">
                <TextWithTooltip className="max-w-full" text={item?.address} />
                <div>{item?.customerPhone}</div>
            </div>

            <div className="flex justify-between items-center pt-2 mt-2">
                <div>
                    <div className="text-xs text-muted-foreground">Invoice</div>
                    <TCell.Money
                        value={item.invoice.total}
                        className={cn(
                            "font-mono$ font-bold",
                            item.invoice.pending == item.invoice.total
                                ? "text-red-600"
                                : item.invoice.pending > 0
                                  ? "text-purple-500"
                                  : "text-green-600",
                        )}
                    />
                    {item.invoice.pending > 0 && (
                        <TCell.Secondary className="text-xs">
                            (Pending:{" "}
                            <TCell.Money
                                value={item.invoice.pending}
                                className="inline-block"
                            />
                            )
                        </TCell.Secondary>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                        Delivery
                    </div>
                    <Progress>
                        <Progress.Status>
                            {item?.deliveryOption || "Not set"}
                        </Progress.Status>
                    </Progress>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <div className="text-muted-foreground">Production</div>
                    <Progress>
                        <Progress.Status>
                            {getProductionStatusLabel(item)}
                        </Progress.Status>
                    </Progress>
                </div>
                <div>
                    <div className="text-muted-foreground">Fulfillment</div>
                    <Progress>
                        <Progress.Status>
                            {getFulfillmentStatusLabel(item)}
                        </Progress.Status>
                    </Progress>
                </div>
            </div>
        </div>
    );
}

