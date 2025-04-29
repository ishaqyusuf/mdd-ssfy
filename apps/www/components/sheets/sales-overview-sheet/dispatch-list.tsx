"use client";

import { useState } from "react";
import { deleteSalesDeliveryAction } from "@/actions/delete-sales-delivery-action";
import { salesProgressFallBackAction } from "@/actions/sales-progress-fallback";
import StatusBadge from "@/components/_v1/status-badge";
import { Menu } from "@/components/(clean-code)/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import { formatDate } from "@/lib/use-day";
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
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Dispatch ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ctx?.data?.deliveries.map((dispatch) => (
                        <Collapsible
                            key={dispatch.id}
                            open={sq.params.dispatchOverviewId === dispatch.id}
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
                                            <Button variant="ghost" size="sm">
                                                {sq.params.dispatchOverviewId ==
                                                dispatch.id ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </CollapsibleTrigger>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {dispatch.id}
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(dispatch.dueDate)}
                                    </TableCell>
                                    <TableCell>
                                        {dispatch.driver?.name}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={dispatch.status} />
                                    </TableCell>
                                    <TableCell className="w-8 text-right">
                                        <Menu>
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
                                    </TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                    <TableRow>
                                        <TableCell colSpan={6} className="p-0">
                                            <div className="bg-muted/50 p-4">
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="font-medium">
                                                            Dispatch Details
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
                                                                {dispatch.items.map(
                                                                    (item) => (
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
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
