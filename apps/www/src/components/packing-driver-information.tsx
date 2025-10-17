import { usePacking } from "@/hooks/use-sales-packing";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Truck } from "lucide-react";

export function PackingDriverInformation() {
    const { data } = usePacking();
    const driver = data.dispatch.driver;
    return (
        <Card>
            <CardHeader className="bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Icons.AccountCircle className="h-5 w-5" />
                    Driver Information
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Driver Name:
                            </span>
                            <span className="text-sm font-medium">
                                {driver?.name}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Driver ID:
                            </span>
                            <span className="text-sm font-medium">
                                #{driver?.id}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Assigned:
                            </span>
                            <span className="text-sm font-medium">
                                {/* {formatDate(
                                new Date(),
                                "MMM d, yyyy h:mm a",
                            )} */}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Vehicle Details
                            </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Vehicle information will be available when driver
                            checks in
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

