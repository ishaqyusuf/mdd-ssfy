"use client";

import { Icons } from "@/components/_v1/icons";
import StatusBadge from "@/components/_v1/status-badge";
import { DataSkeleton } from "@/components/data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { formatDate } from "@/lib/use-day";
import { skeletonListData } from "@/utils/format";

import { useDispatch } from "./context";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useAuth } from "@/hooks/use-auth";
import { ResetSalesControl } from "@sales/schema";
import { newSalesHelper } from "@/lib/sales";
import { Menu } from "@gnd/ui/custom/menu";
import { Item, Table } from "@gnd/ui/namespace";
import { DynamicIcon } from "lucide-react/dynamic";
import { DispatchListMenu } from "./dispatch-list-menu";
export function DispatchList({}) {
    const ctx = useDispatch();
    const sq = useSalesOverviewQuery();

    return (
        <div className="rounded-md border">
            {ctx?.data?.id && !ctx?.data?.deliveries?.length ? (
                <EmptyDelivery />
            ) : (
                <Item.Group role="list" className="divide-y">
                    {skeletonListData(ctx?.data?.deliveries, 2, {})?.map(
                        (dispatch, index) => (
                            <Item
                                key={index}
                                role="listitem"
                                className="cursor-pointer"
                                onClick={() =>
                                    sq.setParams({
                                        dispatchId: dispatch.id,
                                        salesTab: "packing",
                                    })
                                }
                            >
                                {/* LEFT */}
                                <Item.Content className="gap-1">
                                    <Item.Title className="flex items-center gap-3">
                                        <DataSkeleton pok="textSm">
                                            Dispatch #{dispatch.id}
                                        </DataSkeleton>

                                        <StatusBadge status={dispatch.status} />
                                    </Item.Title>

                                    <Item.Description className="flex flex-wrap gap-x-4 gap-y-1">
                                        <span>
                                            <DataSkeleton pok="date">
                                                📅{" "}
                                                {formatDate(dispatch.dueDate) ||
                                                    "No due date"}
                                            </DataSkeleton>
                                        </span>

                                        <span>
                                            <DataSkeleton pok="textSm">
                                                👤 {dispatch?.createdBy?.name}
                                            </DataSkeleton>
                                        </span>

                                        <span>
                                            <DataSkeleton pok="textSm">
                                                🚚{" "}
                                                {dispatch.driver?.name || (
                                                    <span className="italic text-muted-foreground">
                                                        Not assigned
                                                    </span>
                                                )}
                                            </DataSkeleton>
                                        </span>
                                        <span>
                                            <DataSkeleton pok="textSm">
                                                📦{" "}
                                                {dispatch.packPercentage ?? 0}%
                                                packed
                                            </DataSkeleton>
                                        </span>
                                    </Item.Description>
                                </Item.Content>

                                {/* ACTIONS */}
                                <Item.Actions
                                    className="self-start"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <DataSkeleton pok="date">
                                        <DispatchListMenu dispatch={dispatch} />
                                    </DataSkeleton>
                                </Item.Actions>
                            </Item>
                        ),
                    )}
                </Item.Group>
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
