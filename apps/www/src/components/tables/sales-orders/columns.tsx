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

import { Check, ExternalLink, StickyNote } from "lucide-react";
import { InvoiceColumn } from "./column.invoice";
import { cells } from "@gnd/ui/custom/data-table/cells";

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
import {
    FulfillmentCompleteModal,
    FulfillmentDispatch,
} from "./fulfillment-complete-modal";
export type Item = RouterOutputs["sales"]["index"]["data"][number];

function getProductionStatusLabel(item: Item) {
    const status = (item as any)?.control?.productionStatus;
    if (status && status !== "unknown") return status;
    return (
        item.status.production?.scoreStatus || item.status.production?.status
    );
}

function getFulfillmentStatusLabel(item: Item) {
    const status = (item as any)?.control?.dispatchStatus;
    if (status && status !== "unknown") return status;
    return item?.deliveryStatus || "-";
}

export const columns2: ColumnDef<Item>[] = [
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
                        <StickyNote className="w-3 mr-1" />
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
                    className="max-w-[100px] xl:max-w-[200px]"
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
                    className="max-w-[85px] xl:max-w-[120px]"
                    text={item?.customerPhone || "-"}
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
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item?.address}
                />
            </TCell.Secondary>
        ),
    },
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
export const columns: ColumnDef<Item>[] = [
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
                        <StickyNote className="w-3 mr-1" />
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
                    className="max-w-[100px] xl:max-w-[200px]"
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
                    className="max-w-[85px] xl:max-w-[120px]"
                    text={item?.customerPhone || "-"}
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
                    className="max-w-[100px] xl:max-w-[200px]"
                    text={item?.address}
                />
            </TCell.Secondary>
        ),
    },
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

function Actions({ item }: { item: Item }) {
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

            if (payload.createNew || !dispatchId) {
                const createdDispatch = await createDispatch({
                    salesId: item.id,
                    deliveryMode: item.deliveryOption || "delivery",
                    dueDate: payload.completedDate || new Date(),
                    driverId: payload.driverId || undefined,
                    status: "queue",
                });
                dispatchId = createdDispatch.id;
            } else if (
                selectedDispatch &&
                payload.driverId !== (selectedDispatch.driverId ?? null)
            ) {
                await updateDispatchDriver({
                    dispatchId: selectedDispatch.id,
                    oldDriverId: selectedDispatch.driverId ?? null,
                    newDriverId: payload.driverId ?? null,
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
                            <ExternalLink className="mr-2 size-4 text-muted-foreground/70" />
                            <span className="whitespace-nowrap">Open overview</span>
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
                <SalesMenu.Print />
                <SalesMenu.PDF />
                <SuperAdminGuard>
                    <SalesMenu.PrintModes />
                </SuperAdminGuard>
                <SalesMenu.Sub>
                    <SalesMenu.SubTrigger>
                        <Check className="mr-2 size-4 text-muted-foreground/70" />
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
                            <Check className="mr-2 size-4 text-muted-foreground/70" />
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
                            <Check className="mr-2 size-4 text-muted-foreground/70" />
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
                isLoading={
                    dispatchOverview.isLoading || dispatchOverview.isFetching
                }
                isSubmitting={
                    isCreatingDispatch ||
                    isSubmittingDispatch ||
                    isUpdatingDriver ||
                    isDeletingDispatch
                }
                deletingDispatchId={
                    deletingDispatchVars?.dispatchId
                        ? Number(deletingDispatchVars.dispatchId)
                        : null
                }
                onDeleteDispatch={(dispatchId) => {
                    deleteDispatch({ dispatchId });
                }}
                onConfirm={handleFulfillmentConfirm}
            />
        </div>
    );
}
