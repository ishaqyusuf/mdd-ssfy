import { getSalesOverviewAction } from "@/actions/get-sales-overview";
import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import {
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    Factory,
    FileText,
    MapPin,
    CreditCardIcon as PaymentIcon,
    User,
    UserCheck,
} from "lucide-react";
import { useAsyncMemo } from "use-async-memo";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";
import { Separator } from "@gnd/ui/separator";

export function GeneralTab({}) {
    const ctx = useSalesOverviewQuery();

    const loader = async () =>
        // new Promise((resolve) =>
        //     setTimeout(async () => {
        //         resolve(
        {
            await timeout(100);
            const res = await getSalesOverviewAction(
                ctx.params["sales-overview-id"],
            );
            console.log(res);
            return res;
        };
    //     );
    // }, 200),
    // );
    const data = useAsyncMemo(loader, []);
    const paymentPercentage =
        (saleData.costs.paid / saleData.costs.total) * 100;
    return (
        <DataSkeletonProvider value={{ loading: !data?.id } as any}>
            <div className="mt-0 space-y-6 p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-6">
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <User className="h-4 w-4" />
                                CUSTOMER INFORMATION
                            </h3>
                            <div className="space-y-1">
                                <DataSkeleton
                                    className="text-lg font-medium"
                                    placeholder="Customer Name"
                                >
                                    <Button
                                        variant="link"
                                        className="flex h-auto items-center gap-1 p-0 text-lg font-medium hover:no-underline"
                                        // onClick={() =>
                                        //     onCustomerClick(saleData.id)
                                        // }
                                    >
                                        {saleData.customerName}
                                        <ExternalLink className="ml-1 h-4 w-4" />
                                    </Button>
                                </DataSkeleton>
                                <DataSkeleton
                                    className="text-sm text-muted-foreground"
                                    placeholder="(555) 123-4567"
                                >
                                    <p className="text-sm text-muted-foreground">
                                        {saleData.customerPhone}
                                    </p>
                                </DataSkeleton>
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                ORDER DETAILS
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">
                                            Order Number
                                        </p>
                                        <DataSkeleton
                                            className="font-medium"
                                            placeholder="ORD-2023-0042"
                                        >
                                            <p className="font-medium">
                                                {saleData.orderNumber}
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Quote Number
                                        </p>
                                        <DataSkeleton
                                            className="font-medium"
                                            placeholder="QT-2023-0036"
                                        >
                                            <p className="font-medium">
                                                {saleData.quoteNumber}
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">
                                            Date
                                        </p>
                                        <DataSkeleton
                                            className="font-medium"
                                            placeholder="April 10, 2023"
                                        >
                                            <p className="font-medium">
                                                {saleData.date}
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            P.O. Number
                                        </p>
                                        <DataSkeleton
                                            className="font-medium"
                                            placeholder="PO-78945"
                                        >
                                            <p className="font-medium">
                                                {saleData.poNumber}
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <UserCheck className="h-4 w-4" />
                                SALES REPRESENTATIVE
                            </h3>
                            <DataSkeleton
                                className="text-sm font-medium"
                                placeholder="Sarah Johnson"
                            >
                                <p className="text-sm font-medium">
                                    {saleData.salesRep}
                                </p>
                            </DataSkeleton>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <PaymentIcon className="h-4 w-4" />
                                PAYMENT STATUS
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">
                                        Payment Progress
                                    </span>
                                    <DataSkeleton
                                        className="text-sm font-medium"
                                        placeholder="60%"
                                    >
                                        <span className="text-sm font-medium">
                                            {paymentPercentage.toFixed(0)}%
                                        </span>
                                    </DataSkeleton>
                                </div>
                                <DataSkeleton
                                    className="h-2 w-full"
                                    placeholder=""
                                >
                                    <Progress
                                        value={paymentPercentage}
                                        className="h-2"
                                    />
                                </DataSkeleton>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Paid
                                            </p>
                                            <DataSkeleton
                                                className="text-sm font-medium"
                                                placeholder="$3,000.00"
                                            >
                                                <p className="text-sm font-medium">
                                                    $
                                                    {saleData.costs.paid.toFixed(
                                                        2,
                                                    )}
                                                </p>
                                            </DataSkeleton>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Pending
                                            </p>
                                            <DataSkeleton
                                                className="text-sm font-medium"
                                                placeholder="$2,000.00"
                                            >
                                                <p className="text-sm font-medium">
                                                    $
                                                    {saleData.costs.pending.toFixed(
                                                        2,
                                                    )}
                                                </p>
                                            </DataSkeleton>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                COST BREAKDOWN
                            </h3>
                            <Card className="border-border/40">
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Labour
                                            </span>
                                            <DataSkeleton
                                                className=""
                                                placeholder="$1,250.00"
                                            >
                                                <span>
                                                    $
                                                    {saleData.costs.labour.toFixed(
                                                        2,
                                                    )}
                                                </span>
                                            </DataSkeleton>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Materials
                                            </span>
                                            <DataSkeleton
                                                className=""
                                                placeholder="$3,600.00"
                                            >
                                                <span>
                                                    $
                                                    {saleData.costs.materials.toFixed(
                                                        2,
                                                    )}
                                                </span>
                                            </DataSkeleton>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Delivery
                                            </span>
                                            <DataSkeleton
                                                className=""
                                                placeholder="$150.00"
                                            >
                                                <span>
                                                    $
                                                    {saleData.costs.delivery.toFixed(
                                                        2,
                                                    )}
                                                </span>
                                            </DataSkeleton>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Total</span>
                                            <DataSkeleton
                                                className="font-medium"
                                                placeholder="$5,000.00"
                                            >
                                                <span>
                                                    $
                                                    {saleData.costs.total.toFixed(
                                                        2,
                                                    )}
                                                </span>
                                            </DataSkeleton>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        ADDRESSES
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Card className="border-border/40">
                            <CardContent className="p-4">
                                <h4 className="mb-2 font-medium">
                                    Shipping Address
                                </h4>
                                <DataSkeleton
                                    className="text-sm not-italic text-muted-foreground"
                                    placeholder="123 Delivery St, Suite 101, Shipville, CA 90210, USA"
                                >
                                    <address className="text-sm not-italic text-muted-foreground">
                                        {saleData.shippingAddress.line1}
                                        <br />
                                        {saleData.shippingAddress.line2 && (
                                            <>
                                                {saleData.shippingAddress.line2}
                                                <br />
                                            </>
                                        )}
                                        {saleData.shippingAddress.city},{" "}
                                        {saleData.shippingAddress.state}{" "}
                                        {saleData.shippingAddress.postalCode}
                                        <br />
                                        {saleData.shippingAddress.country}
                                    </address>
                                </DataSkeleton>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40">
                            <CardContent className="p-4">
                                <h4 className="mb-2 font-medium">
                                    Billing Address
                                </h4>
                                <DataSkeleton
                                    className="text-sm not-italic text-muted-foreground"
                                    placeholder="456 Invoice Ave, Billtown, NY 10001, USA"
                                >
                                    <address className="text-sm not-italic text-muted-foreground">
                                        {saleData.billingAddress.line1}
                                        <br />
                                        {saleData.billingAddress.line2 && (
                                            <>
                                                {saleData.billingAddress.line2}
                                                <br />
                                            </>
                                        )}
                                        {saleData.billingAddress.city},{" "}
                                        {saleData.billingAddress.state}{" "}
                                        {saleData.billingAddress.postalCode}
                                        <br />
                                        {saleData.billingAddress.country}
                                    </address>
                                </DataSkeleton>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Factory className="h-4 w-4" />
                        PRODUCTION STATUS
                    </h3>
                    <Card className="border-border/40">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm">Progress</span>
                                <DataSkeleton
                                    className="rounded-full px-2 py-1 text-xs font-medium"
                                    placeholder="In Progress"
                                >
                                    <Badge
                                        variant={getProductionStatusVariant(
                                            saleData.productionStatus
                                                .percentage,
                                        )}
                                    >
                                        {saleData.productionStatus.status}
                                    </Badge>
                                </DataSkeleton>
                            </div>
                            <DataSkeleton
                                className="mb-3 h-2 w-full"
                                placeholder=""
                            >
                                <Progress
                                    value={saleData.productionStatus.percentage}
                                    className="mb-3 h-2"
                                />
                            </DataSkeleton>
                            <DataSkeleton
                                className="text-sm text-muted-foreground"
                                placeholder="4/5 assigned, 2/4 production completed"
                            >
                                <p className="text-sm text-muted-foreground">
                                    {saleData.productionStatus.details}
                                </p>
                            </DataSkeleton>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DataSkeletonProvider>
    );
}

function getProductionStatusVariant(
    percentage: number,
): "default" | "secondary" | "outline" {
    if (percentage === 0) return "outline";
    if (percentage < 50) return "secondary";
    if (percentage < 100) return "secondary";
    return "default";
}

function getShippingStatusVariant(
    status: string,
): "default" | "secondary" | "destructive" | "outline" {
    switch (status.toLowerCase()) {
        case "shipped":
            return "default";
        case "processing":
            return "secondary";
        case "pending":
            return "outline";
        case "cancelled":
            return "destructive";
        default:
            return "outline";
    }
}
const saleData = {
    id: "sale-123",
    orderNumber: "ORD-2023-0042",
    quoteNumber: "QT-2023-0036",
    customerName: "John Smith",
    customerPhone: "(555) 123-4567",
    date: "April 10, 2023",
    salesRep: "Sarah Johnson",
    poNumber: "PO-78945",
    costs: {
        labour: 1250.0,
        delivery: 150.0,
        materials: 3600.0,
        total: 5000.0,
        paid: 3000.0,
        pending: 2000.0,
    },
    shippingAddress: {
        line1: "123 Delivery St",
        line2: "Suite 101",
        city: "Shipville",
        state: "CA",
        postalCode: "90210",
        country: "USA",
    },
    billingAddress: {
        line1: "456 Invoice Ave",
        line2: "",
        city: "Billtown",
        state: "NY",
        postalCode: "10001",
        country: "USA",
    },
    productionStatus: {
        status: "In Progress",
        percentage: 60,
        details: "4/5 assigned, 2/4 production completed",
    },
    shippingStatus: "Processing",
};
