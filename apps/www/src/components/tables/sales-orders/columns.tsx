"use client";
import * as React from "react";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@/types/type";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Badge } from "@gnd/ui/badge";
import { buttonVariants } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

import { Check, StickyNote } from "lucide-react";
import { InvoiceColumn } from "./column.invoice";
import { cells } from "@gnd/ui/custom/data-table/cells";

import Link from "next/link";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { useBin } from "@/hooks/use-bin";
import { useAuth } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { UpdateSalesControl } from "@sales/schema";
import { toast } from "@gnd/ui/use-toast";
export type Item = RouterOutputs["sales"]["index"]["data"][number];
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
                    {item.status.production?.scoreStatus ||
                        item.status.production?.status}
                </Progress.Status>
            </Progress>
        ),
    },
    {
        header: "Fulfillment",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>{item?.deliveryStatus || "-"}</Progress.Status>
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
                    {item.status.production?.scoreStatus ||
                        item.status.production?.status}
                </Progress.Status>
            </Progress>
        ),
    },
    {
        header: "Fulfillment",
        accessorKey: "dispatch",
        cell: ({ row: { original: item } }) => (
            <Progress.Status>{item?.deliveryStatus || "-"}</Progress.Status>
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
    const produceable = !!item.stats?.prodCompleted?.total;
    const isBin = useBin();
    const auth = useAuth();
    const trpc = useTRPC();
    const { trigger } = useTaskTrigger({
        silent: true,
        onSuccess() {
            invalidateInfiniteQueries("sales.getOrders");
            toast({
                title: "Updated sales order.",
                description: `Sales order ${item.orderId} has been updated.`,
            });
        },
    });
    const activeDispatch = ((item as any)?.deliveries || []).find(
        (delivery) => !["cancelled", "completed"].includes(delivery?.status),
    );
    const { mutate: createDispatch } = useMutation(
        trpc.dispatch.createDispatch.mutationOptions({
            onSuccess() {
                invalidateInfiniteQueries("sales.getOrders");
            },
        }),
    );
    const triggerDispatchAction = (
        action: "production" | "fulfillment",
        dispatchId: number,
        dispatchStatus?: string,
    ) => {
        const payload: UpdateSalesControl = {
            meta: {
                salesId: item.id,
                authorId: auth?.id!,
                authorName: auth?.name!,
            },
            ...(action === "production"
                ? {
                      packItems: {
                          dispatchId,
                          dispatchStatus: (dispatchStatus || "queue") as any,
                          packMode: "all",
                      },
                  }
                : {
                      markAsCompleted: {
                          dispatchId,
                          receivedBy: auth?.name || "System",
                          receivedDate: new Date(),
                      },
                  }),
        };
        trigger({
            taskName: "update-sales-control",
            payload,
        });
    };
    const ensureDispatchAndTrigger = (action: "production" | "fulfillment") => {
        if (activeDispatch?.id) {
            triggerDispatchAction(
                action,
                activeDispatch.id,
                activeDispatch.status,
            );
            return;
        }
        createDispatch(
            {
                salesId: item.id,
                deliveryMode: item.deliveryOption || "delivery",
                dueDate: new Date(),
                status: "queue",
            },
            {
                onSuccess(dispatch) {
                    triggerDispatchAction(action, dispatch.id, dispatch.status);
                },
            },
        );
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
            <Menu>
                <MenuItemPrintAction pdf type="order" salesIds={[item.id]} />
                <MenuItemPrintAction type="order" salesIds={[item.id]} />
                <Menu.Item
                    Icon={Check}
                    SubMenu={
                        <>
                            <Menu.Item
                                disabled={!produceable}
                                onClick={(e) => {
                                    e.preventDefault();
                                    ensureDispatchAndTrigger("production");
                                }}
                            >
                                Production Complete
                            </Menu.Item>
                            <Menu.Item
                                onClick={(e) => {
                                    e.preventDefault();
                                    ensureDispatchAndTrigger("fulfillment");
                                }}
                            >
                                Fulfillment Complete
                            </Menu.Item>
                        </>
                    }
                >
                    Mark as
                </Menu.Item>
            </Menu>
        </div>
    );
}

