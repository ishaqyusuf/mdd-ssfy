import { RouterOutputs } from "@api/trpc/routers/_app";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Progress } from "./(clean-code)/progress";
import { formatDate } from "@gnd/utils/dayjs";
import { Badge } from "@gnd/ui/badge";
import { MapPin } from "lucide-react";
import { qtyMatrixSum } from "@api/utils/sales-control";

export function PackingOrderInformation({
    data,
}: {
    data: RouterOutputs["dispatch"]["dispatchOverview"];
}) {
    const { dispatch, order, address } = data;
    return (
        <Card>
            <CardHeader className="bg-muted/20">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <CardTitle className="text-lg">
                            Dispatch Information
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap">
                            <Progress>
                                <Progress.Status>
                                    {dispatch?.status}
                                </Progress.Status>
                            </Progress>
                            <Badge
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200"
                            >
                                {dispatch.deliveryMode === "delivery"
                                    ? "Delivery"
                                    : "Pickup"}
                            </Badge>
                        </div>
                    </div>

                    <Progress>
                        <Progress.ProgressBar
                            className="w-full"
                            showPercent
                            label="Items packed"
                            score={
                                qtyMatrixSum(
                                    data.dispatchItems?.map(
                                        (a) => a.listedQty,
                                    ) as any,
                                )?.qty || 0
                            }
                            total={
                                qtyMatrixSum(
                                    data.dispatchItems?.map(
                                        (a) => a.totalQty,
                                    ) as any,
                                )?.qty || 0
                            }
                        />
                    </Progress>
                    {/* Packing Progress Bar */}
                    {/* <PackingProgressBar
                        totalItems={totalItems}
                        packedItems={packedItems}
                        className="mt-2"
                    /> */}
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dispatch Details */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                            Dispatch Details
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Dispatch #:
                                </span>
                                <span className="text-sm font-medium">
                                    {dispatch.dispatchNumber}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Order ID:
                                </span>
                                <span className="text-sm font-medium">
                                    {order.orderId}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Order Date:
                                </span>
                                <span className="text-sm font-medium">
                                    {formatDate(order.date)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Due Date:
                                </span>
                                <div className="text-right">
                                    <span className="text-sm font-medium">
                                        {formatDate(dispatch.dueDate)}
                                    </span>
                                    <div className="text-xs text-muted-foreground">
                                        {/* {getScheduleStatusInfo()} */}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Created:
                                </span>
                                <span className="text-sm font-medium">
                                    {formatDate(dispatch.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Information */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Delivery Information
                        </h4>
                        <div className="space-y-2">
                            <div>
                                <span className="text-sm font-medium text-muted-foreground block">
                                    Customer:
                                </span>
                                <span className="text-sm font-medium">
                                    {address.name}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-muted-foreground block">
                                    Address:
                                </span>
                                <div className="text-sm">
                                    <div>{address.address1}</div>
                                    {address.address2 && (
                                        <div>{address.address2}</div>
                                    )}
                                    <div>
                                        {address.city}, {address.state}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Phone:
                                </span>
                                <span className="text-sm font-medium">
                                    {address.phoneNo}
                                </span>
                            </div>
                            {address.email && (
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Email:
                                    </span>
                                    <span className="text-sm font-medium">
                                        {address.email}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Information */}
                <div className="border-t pt-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                        Status Information
                    </h4>
                    {/* <PackingStatusInfo
                        packingStatus={packingStatus}
                        scheduleStatus={scheduleStatus}
                        totalItems={totalItems}
                        packedItems={packedItems}
                        pendingItems={pendingItems}
                    /> */}
                </div>
            </CardContent>
        </Card>
    );
}

