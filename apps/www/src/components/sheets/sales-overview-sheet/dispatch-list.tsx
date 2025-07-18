"use client";

import { useState } from "react";
import { deleteSalesDeliveryAction } from "@/actions/delete-sales-delivery-action";
import { salesProgressFallBackAction } from "@/actions/sales-progress-fallback";
import { Icons } from "@/components/_v1/icons";
import StatusBadge from "@/components/_v1/status-badge";
import { Menu } from "@/components/(clean-code)/menu";
import { DataSkeleton } from "@/components/data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import { formatDate } from "@/lib/use-day";
import { skeletonListData } from "@/utils/format";
import { ChevronDown, ChevronUp, Edit } from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { useDispatch } from "./context";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { printSalesData } from "@/utils/sales-print-utils";

export function DispatchList({}) {
    const ctx = useDispatch();
    const sq = useSalesOverviewQuery();
    const loader = useLoadingToast();
    const deleteDispatch = async (id) => {
        loader.loading("Deleting....");
        await timeout(500);
        await deleteSalesDeliveryAction({
            deliveryId: id,
        });
        loader.success("Deleted!.");
        sq._refreshToken();
    };
    const { setParams: setSalesPreviewParams } = useSalesPreview();
    return (
        <div className="rounded-md border">
            {ctx?.data?.id && !ctx?.data?.deliveries?.length ? (
                <EmptyDelivery />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Dispatch ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Assigned By</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* <DataSkeleton className="min-h-36" key={index}> */}
                        {skeletonListData(ctx?.data?.deliveries, 2, {})?.map(
                            (dispatch, index) => (
                                <Collapsible
                                    key={dispatch.id}
                                    open={
                                        sq.params.dispatchOverviewId ===
                                        dispatch.id
                                    }
                                    onOpenChange={() =>
                                        sq.setParams({
                                            dispatchOverviewId:
                                                sq.params.dispatchOverviewId ==
                                                dispatch.id
                                                    ? null
                                                    : dispatch.id,
                                        })
                                    }
                                    asChild
                                >
                                    <>
                                        <TableRow>
                                            <TableCell>
                                                <CollapsibleTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        {sq.params
                                                            .dispatchOverviewId ==
                                                        dispatch.id ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </CollapsibleTrigger>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <DataSkeleton pok="date">
                                                    {dispatch.id}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell>
                                                <DataSkeleton pok="date">
                                                    {formatDate(
                                                        dispatch.dueDate,
                                                    )}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell>
                                                <DataSkeleton pok="textSm">
                                                    {dispatch?.createdBy?.name}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell>
                                                <DataSkeleton pok="date">
                                                    {dispatch.driver?.name}
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell>
                                                <DataSkeleton pok="date">
                                                    <StatusBadge
                                                        status={dispatch.status}
                                                    />
                                                </DataSkeleton>
                                            </TableCell>
                                            <TableCell className="w-8 text-right">
                                                <DataSkeleton pok="date">
                                                    <Menu>
                                                        <Menu.Item
                                                            icon="packingList"
                                                            onClick={(e) => {
                                                                setSalesPreviewParams(
                                                                    {
                                                                        previewMode:
                                                                            "packing list",
                                                                        salesPreviewSlug:
                                                                            ctx
                                                                                ?.data
                                                                                ?.order
                                                                                ?.orderId,
                                                                        salesPreviewType:
                                                                            "order",
                                                                        dispatchId:
                                                                            String(
                                                                                dispatch.id,
                                                                            ),
                                                                    },
                                                                );
                                                            }}
                                                        >
                                                            Preview
                                                        </Menu.Item>
                                                        <Menu.Item
                                                            icon="print"
                                                            onClick={(e) => {
                                                                printSalesData({
                                                                    mode: "order-packing",
                                                                    dispatchId:
                                                                        dispatch.id,
                                                                    preview:
                                                                        false,
                                                                    slugs: ctx
                                                                        ?.data
                                                                        ?.order
                                                                        ?.orderId,
                                                                });
                                                            }}
                                                        >
                                                            Print
                                                        </Menu.Item>
                                                        <Menu.Trash
                                                            action={async () =>
                                                                await deleteDispatch(
                                                                    dispatch.id,
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </Menu.Trash>
                                                    </Menu>
                                                </DataSkeleton>
                                            </TableCell>
                                        </TableRow>
                                        <CollapsibleContent asChild>
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="p-0"
                                                >
                                                    <div className="bg-muted/50 p-4">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <h4 className="font-medium">
                                                                    Dispatch
                                                                    Details
                                                                </h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Method:{" "}
                                                                    {
                                                                        dispatch.deliveryMode
                                                                    }
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Notes:{" "}
                                                                    {/* {dispatch.notes} */}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="mb-2 font-medium">
                                                                    Items
                                                                </h4>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>
                                                                                Item
                                                                            </TableHead>
                                                                            <TableHead>
                                                                                Available
                                                                                Qty
                                                                            </TableHead>
                                                                            <TableHead>
                                                                                Dispatch
                                                                                Qty
                                                                            </TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {dispatch.items?.map(
                                                                            (
                                                                                item,
                                                                            ) => (
                                                                                <TableRow
                                                                                    key={
                                                                                        item.id
                                                                                    }
                                                                                >
                                                                                    <TableCell>
                                                                                        {
                                                                                            item
                                                                                                .item
                                                                                                .title
                                                                                        }
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {
                                                                                            item.qty
                                                                                        }
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {
                                                                                            item.qty
                                                                                        }
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ),
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </CollapsibleContent>
                                    </>
                                </Collapsible>
                            ),
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
function EmptyDelivery() {
    return (
        <div className="flex h-36 items-center justify-center">
            <div className="flex flex-col items-center">
                <Icons.delivery className="mb-4" />
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">No Delivery</h2>
                    <p className="text-sm text-[#606060]">
                        {"There are no assignments on this item"}
                    </p>
                </div>
            </div>
        </div>
    );
}
