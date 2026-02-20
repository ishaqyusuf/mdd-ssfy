"use client";

import { Icons } from "@/components/_v1/icons";
import StatusBadge from "@/components/_v1/status-badge";
import { DataSkeleton } from "@/components/data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { formatDate } from "@/lib/use-day";
import { skeletonListData } from "@/utils/format";

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
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useAuth } from "@/hooks/use-auth";
import { ResetSalesControl } from "@sales/schema";
import { newSalesHelper } from "@/lib/sales";
import { Menu } from "@gnd/ui/custom/menu";

export function DispatchList({}) {
    const ctx = useDispatch();
    const sq = useSalesOverviewQuery();
    const loader = useLoadingToast();
    const auth = useAuth();
    const { mutate: mutateDeleteDispatch, isPending: isDeleting } = useMutation(
        useTRPC().dispatch.deleteDispatch.mutationOptions({
            onSuccess() {
                loader.success("Deleted!.");
                sq.salesQuery.dispatchUpdated();
                trigger({
                    taskName: "reset-sales-control",
                    payload: {
                        meta: {
                            salesId: ctx.data?.id!,
                            authorId: auth?.id!,
                            authorName: auth?.name!,
                        },
                    } as ResetSalesControl,
                });
            },
        }),
    );
    const { trigger } = useTaskTrigger({
        silent: true,
        onSuccess() {
            sq.salesQuery.dispatchUpdated();
            console.log("triggered fallback");
        },
    });
    const deleteDispatch = async (id) => {
        mutateDeleteDispatch({
            dispatchId: id,
        });
    };
    const { setParams: setSalesPreviewParams } = useSalesPreview();
    const sh = newSalesHelper();
    const preview = async (dispatchId) => {
        await sh.generateTokenDispatchId(ctx.data.id, dispatchId);
        sh.openPrintLink();
    };
    return (
        <div className="rounded-md border">
            {ctx?.data?.id && !ctx?.data?.deliveries?.length ? (
                <EmptyDelivery />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
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
                            // <Collapsible
                            //     open={
                            //         sq.params.dispatchOverviewId ===
                            //         dispatch.id
                            //     }
                            //     key={`collapsible-${index}`}
                            //     onOpenChange={() =>
                            //         sq.setParams({
                            //             dispatchOverviewId:
                            //                 sq.params.dispatchOverviewId ==
                            //                 dispatch.id
                            //                     ? null
                            //                     : dispatch.id,
                            //         })
                            //     }
                            //     asChild
                            // >
                            (dispatch, index) => (
                                <TableRow
                                    key={index}
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                        sq.setParams({
                                            dispatchId: dispatch.id,
                                            salesTab: "packing",
                                        });
                                    }}
                                >
                                    <TableCell className="font-medium">
                                        <DataSkeleton pok="date">
                                            {dispatch.id}
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell>
                                        <DataSkeleton pok="date">
                                            {formatDate(dispatch.dueDate) ||
                                                "No due date"}
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell>
                                        <DataSkeleton pok="textSm">
                                            {dispatch?.createdBy?.name}
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell>
                                        <DataSkeleton pok="date">
                                            {dispatch.driver?.name || (
                                                <span className="italics">
                                                    Not assigned
                                                </span>
                                            )}
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
                                                        e.preventDefault();
                                                        preview(dispatch.id);
                                                    }}
                                                >
                                                    Preview
                                                </Menu.Item>

                                                <Menu.Trash
                                                    action={(e) =>
                                                        deleteDispatch(
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
                            ),
                            {
                                /* </Collapsible> */
                            },
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
