import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Progress } from "./(clean-code)/progress";
import { formatDate } from "@gnd/utils/dayjs";
import { Badge } from "@gnd/ui/badge";
import { MapPin } from "lucide-react";
import { getColorFromName } from "@/lib/color";
import { getScheduleStatusInfo } from "@gnd/utils";
import { cn } from "@gnd/ui/cn";
import { PackingProgress } from "./packing-progress";
import { usePacking } from "@/hooks/use-sales-packing";

export function PackingOrderInformation() {
    const { data } = usePacking();
    const { dispatch, order, address } = data;
    const schedule = getScheduleStatusInfo(dispatch.dueDate, {
        duePrefix: "Overdue",
        futurePrefix: "Due",
    });
    return (
        <Card>
            <CardHeader className="bg-muted/20">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <CardTitle className="text-lg flex items-center">
                            <span>Dispatch Information</span>
                            <Badge
                                variant="outline"
                                style={{
                                    backgroundColor: getColorFromName(
                                        dispatch.deliveryMode,
                                    ),
                                }}
                                className="mx-2 uppercase font-mono$ text-muted-foreground"
                            >
                                {dispatch.deliveryMode}
                            </Badge>
                        </CardTitle>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Progress>
                                <Progress.Status>
                                    {dispatch?.status}
                                </Progress.Status>
                            </Progress>
                        </div>
                    </div>

                    <PackingProgress />
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
                                    {!schedule.status || (
                                        <div
                                            style={{
                                                color: schedule.color,
                                            }}
                                            className={cn(
                                                "text-xs text-muted-foreground",
                                            )}
                                        >
                                            {schedule.status}
                                        </div>
                                    )}
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

