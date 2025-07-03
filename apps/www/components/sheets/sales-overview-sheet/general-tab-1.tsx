import React from "react";
import { getSalesOverviewAction } from "@/actions/get-sales-overview";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import TextWithTooltip from "@/components/(clean-code)/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { DataSkeleton } from "@/components/data-skeleton";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { openLink } from "@/lib/open-link";
import { timeout } from "@/lib/timeout";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { salesFormUrl } from "@/utils/sales-utils";
import {
    Building,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    Factory,
    FileText,
    Mail,
    MapPin,
    Package,
    CreditCardIcon as PaymentIcon,
    Phone,
    User,
    UserCheck,
} from "lucide-react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";
import { Separator } from "@gnd/ui/separator";

import { useSaleOverview } from "./context";
import { GeneralFooter } from "./general-footer";
import { SalesPO } from "./inline-data-edit";

export function GeneralTab({}) {
    const ctx = useSalesOverviewQuery();

    const { data } = useSaleOverview();
    const customerQuery = useCustomerOverviewQuery();
    // data.id
    const ph = {
        invoice: {},
        addressData: {
            shipping: {},
            billing: {},
        },
        status: {
            delivery: {},
            assignment: {},
            production: {},
        },
        dispatchList: [],
        stats: {
            prodAssigned: {},
        },
    } as Partial<typeof data>;
    const saleData = data || ph;
    const paymentPercentage =
        saleData?.invoice?.total > 0
            ? (saleData?.invoice?.paid / saleData?.invoice?.total) * 100
            : 0;
    const productionPercentage = saleData?.stats?.prodCompleted?.percentage;
    const assignmentPercentage = saleData?.stats?.prodAssigned?.percentage;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "green":
                return "bg-green-500";
            case "amber":
            case "yellow":
                return "bg-amber-500";
            case "red":
                return "bg-red-500";
            case "blue":
                return "bg-blue-500";
            case "warmGray":
            default:
                return "bg-slate-400";
        }
    };

    const getStatusVariant = (
        status: string,
    ): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case "completed":
                return "default";
            case "in-progress":
                return "secondary";
            case "pending":
                return "outline";
            case "cancelled":
                return "destructive";
            default:
                return "outline";
        }
    };
    return (
        <DataSkeletonProvider value={{ loading: !saleData?.id } as any}>
            <div className="relative mt-0 space-y-6 p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-6">
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <User className="h-4 w-4" />
                                CUSTOMER INFORMATION
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <DataSkeleton
                                            className="text-lg font-medium"
                                            placeholder="Customer Name"
                                        >
                                            <Button
                                                variant="secondary"
                                                size="xs"
                                                // href={saleData?.links?.customer}
                                                onClick={(e) => {
                                                    customerQuery.open(
                                                        saleData.accountNo,
                                                    );
                                                }}
                                                className="flex items-center gap-1 text-lg font-medium"
                                            >
                                                <TextWithTooltip
                                                    className="max-w-[150px]"
                                                    text={saleData?.displayName}
                                                />
                                                <ExternalLink className="ml-1 h-4 w-4" />
                                            </Button>
                                        </DataSkeleton>
                                        {saleData?.isBusiness && (
                                            <DataSkeleton
                                                className="text-sm text-muted-foreground"
                                                placeholder="Business"
                                            >
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Building className="h-3 w-3" />
                                                    <span>Business</span>
                                                </div>
                                            </DataSkeleton>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <DataSkeleton
                                        className="text-sm"
                                        placeholder="239-825-2782"
                                    >
                                        <span>{saleData?.customerPhone}</span>
                                    </DataSkeleton>
                                </div>

                                {saleData?.email && (
                                    <div className="flex items-start gap-2">
                                        <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <DataSkeleton
                                            className="text-sm"
                                            placeholder="customer@example.com"
                                        >
                                            <span>{saleData?.email}</span>
                                        </DataSkeleton>
                                    </div>
                                )}
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
                                            placeholder="03527PC"
                                        >
                                            <Button
                                                variant="secondary"
                                                size="xs"
                                                // href={saleData?.links?.customer}
                                                onClick={(e) => {
                                                    openLink(
                                                        salesFormUrl(
                                                            saleData.type,
                                                            saleData.orderId,
                                                            saleData.isDyke,
                                                        ),
                                                        {},
                                                        true,
                                                    );
                                                }}
                                                className="flex items-center gap-1 font-medium"
                                            >
                                                <TextWithTooltip
                                                    className="max-w-[150px]"
                                                    text={saleData?.orderId}
                                                />
                                                <ExternalLink className="ml-1 h-4 w-4" />
                                            </Button>
                                        </DataSkeleton>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Type
                                        </p>
                                        <DataSkeleton
                                            className="font-medium"
                                            placeholder="Order"
                                        >
                                            <p className="font-medium capitalize">
                                                {saleData?.isQuote
                                                    ? "Quote"
                                                    : saleData?.type}
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
                                            placeholder="04/04/25"
                                        >
                                            <p className="font-medium">
                                                {saleData.salesDate}
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            Delivery Option
                                        </p>
                                        <DataSkeleton
                                            className="font-medium"
                                            placeholder="Standard"
                                        >
                                            <p className="font-medium">
                                                {saleData?.deliveryOption ||
                                                    "Standard"}
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                    <SalesPO
                                        salesId={saleData.id}
                                        value={saleData.poNo}
                                    />
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
                                placeholder="Pablo Cruz (PC)"
                            >
                                <p className="text-sm font-medium">
                                    {saleData?.salesRep}{" "}
                                    {saleData?.salesRepInitial &&
                                        `(${saleData?.salesRepInitial})`}
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
                                        placeholder="0%"
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
                                                placeholder="$0.00"
                                            >
                                                <p className="text-sm font-medium">
                                                    $
                                                    {saleData?.invoice?.paid?.toFixed(
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
                                                placeholder="$3,217.63"
                                            >
                                                <p className="text-sm font-medium">
                                                    $
                                                    {saleData.invoice.pending?.toFixed(
                                                        2,
                                                    )}
                                                </p>
                                            </DataSkeleton>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-4 border-t border-border/40  pt-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Payment Terms
                                        </p>
                                        <DataSkeleton
                                            className="text-sm font-medium"
                                            placeholder="NET10"
                                        >
                                            <p className="text-sm font-medium">
                                                {saleData.netTerm}
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Due Date
                                        </p>
                                        <DataSkeleton
                                            className="text-sm font-medium"
                                            placeholder="04/14/25"
                                        >
                                            <p className="text-sm font-medium">
                                                <TCell.Date>
                                                    {saleData.dueDate}
                                                </TCell.Date>
                                            </p>
                                        </DataSkeleton>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {!saleData.due || (
                            <Button
                                className="w-full"
                                onClick={(e) => {
                                    customerQuery.pay({
                                        phoneNo: saleData.customerPhone,
                                        orderId: saleData.id,
                                        customerId: saleData.customerId,
                                    });
                                }}
                            >
                                <Icons.payment className="mr-2 size-4" />
                                Pay
                            </Button>
                        )}
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                INVOICE DETAILS
                            </h3>
                            <Card className="border-border/40">
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        {saleData?.costLines?.map((c, ci) => (
                                            <div
                                                key={ci}
                                                className="flex justify-between text-sm"
                                            >
                                                <span className="text-muted-foreground">
                                                    {c.label}
                                                </span>
                                                <DataSkeleton
                                                    className=""
                                                    placeholder="$0.00"
                                                >
                                                    <span>
                                                        <Money
                                                            value={c?.amount}
                                                        />
                                                    </span>
                                                </DataSkeleton>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Total Invoice
                                            </span>
                                            <DataSkeleton
                                                className=""
                                                placeholder="$3,217.63"
                                            >
                                                <span>
                                                    <Money
                                                        value={
                                                            saleData.invoice
                                                                .total
                                                        }
                                                    />
                                                </span>
                                            </DataSkeleton>
                                        </div>

                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Paid Amount
                                            </span>
                                            <DataSkeleton
                                                className=""
                                                placeholder="$0.00"
                                            >
                                                <span>
                                                    <Money
                                                        value={
                                                            saleData.invoice
                                                                .paid
                                                        }
                                                    />
                                                </span>
                                            </DataSkeleton>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Due Amount</span>
                                            <DataSkeleton
                                                className="font-medium"
                                                placeholder="$3,217.63"
                                            >
                                                <span>
                                                    <Money
                                                        value={saleData.due}
                                                    />
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
                        {[
                            saleData?.addressData?.billing,
                            saleData?.addressData?.shipping,
                        ]?.map((address, ai) => (
                            <Card
                                key={ai}
                                // key={address?.title}
                                className="border-border/40"
                            >
                                <CardContent className="p-4">
                                    <h4 className="mb-2 font-medium">
                                        {address?.title}
                                    </h4>
                                    <DataSkeleton
                                        className="text-sm not-italic text-muted-foreground"
                                        placeholder="1713 LEE AVE"
                                    >
                                        <address className="text-sm not-italic text-muted-foreground">
                                            {address?.lines
                                                ?.filter(Boolean)
                                                .map((line, li) => (
                                                    <React.Fragment key={li}>
                                                        {line}
                                                        <br />
                                                    </React.Fragment>
                                                ))}
                                        </address>
                                    </DataSkeleton>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Factory className="h-4 w-4" />
                        PRODUCTION STATUS
                    </h3>
                    {saleData?.stats?.prodAssigned?.total === 0 &&
                    saleData?.id ? (
                        <Card className="border-border/40">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-center py-2">
                                    <p className="text-sm text-muted-foreground">
                                        Production not applicable for this sale
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <Card className="border-border/40">
                                <CardContent className="p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-sm">
                                            Assignment Progress
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`h-2 w-2 rounded-full ${getStatusColor(saleData?.status?.assignment?.color)}`}
                                            ></div>
                                            <DataSkeleton
                                                className="text-xs font-medium"
                                                placeholder="Completed"
                                            >
                                                <span className="text-xs font-medium capitalize">
                                                    {
                                                        saleData.status
                                                            .assignment.status
                                                    }
                                                </span>
                                            </DataSkeleton>
                                        </div>
                                    </div>
                                    <DataSkeleton
                                        className="mb-3 h-2 w-full"
                                        placeholder=""
                                    >
                                        <Progress
                                            value={assignmentPercentage}
                                            className="mb-3 h-2"
                                        />
                                    </DataSkeleton>
                                    <DataSkeleton
                                        className="text-sm text-muted-foreground"
                                        placeholder="7/7 items assigned"
                                    >
                                        <p className="text-sm text-muted-foreground">
                                            {saleData.stats.prodAssigned?.score}
                                            /
                                            {saleData.stats.prodAssigned?.total}{" "}
                                            items assigned
                                        </p>
                                    </DataSkeleton>
                                </CardContent>
                            </Card>

                            <Card className="border-border/40">
                                <CardContent className="p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-sm">
                                            Production Progress
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`h-2 w-2 rounded-full ${getStatusColor(saleData?.status?.production?.color)}`}
                                            ></div>
                                            <DataSkeleton
                                                className="text-xs font-medium"
                                                placeholder="Pending"
                                            >
                                                <span className="text-xs font-medium capitalize">
                                                    {
                                                        saleData.status
                                                            .production.status
                                                    }
                                                </span>
                                            </DataSkeleton>
                                        </div>
                                    </div>
                                    <DataSkeleton
                                        className="mb-3 h-2 w-full"
                                        placeholder=""
                                    >
                                        <Progress
                                            value={productionPercentage}
                                            className="mb-3 h-2"
                                        />
                                    </DataSkeleton>
                                    <DataSkeleton
                                        className="text-sm text-muted-foreground"
                                        placeholder="0/7 items completed"
                                    >
                                        <p className="text-sm text-muted-foreground">
                                            {
                                                saleData?.stats?.prodCompleted
                                                    ?.score
                                            }
                                            /
                                            {
                                                saleData?.stats?.prodCompleted
                                                    ?.total
                                            }{" "}
                                            items completed
                                        </p>
                                    </DataSkeleton>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Package className="h-4 w-4" />
                        SHIPPING STATUS
                    </h3>
                    <Card className="border-border/40">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm">Delivery Status</span>
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`h-2 w-2 rounded-full ${getStatusColor(saleData.status.delivery.color)}`}
                                    ></div>
                                    <DataSkeleton
                                        className="text-xs font-medium"
                                        placeholder="Pending"
                                    >
                                        <Badge
                                            variant={getStatusVariant(
                                                saleData.status.delivery.status,
                                            )}
                                        >
                                            <span className="capitalize">
                                                {
                                                    saleData.status.delivery
                                                        .status
                                                }
                                            </span>
                                        </Badge>
                                    </DataSkeleton>
                                </div>
                            </div>
                            <DataSkeleton
                                className="text-sm text-muted-foreground"
                                placeholder="No dispatch information available"
                            >
                                <p className="text-sm text-muted-foreground">
                                    {saleData.dispatchList.length > 0
                                        ? `${saleData.dispatchList.length} dispatch entries available`
                                        : "No dispatch information available"}
                                </p>
                            </DataSkeleton>
                        </CardContent>
                    </Card>
                </div>
                {!data?.id || (
                    <Note
                        admin
                        tagFilters={[
                            noteTagFilter("salesId", String(data?.id)),
                        ]}
                        typeFilters={[
                            "general",
                            "dispatch",
                            "payment",
                            "production",
                        ]}
                        statusFilters={["public", "private"]}
                        subject={`Sales Note`}
                        headline={`${data?.orderId}`}
                    />
                )}
                <GeneralFooter />
            </div>
        </DataSkeletonProvider>
    );
}
