import React from "react";
import { Icons } from "@gnd/ui/icons";
import Money from "@/components/_v1/money";
import {
    getSingleInventoryInboundId,
    InventoryInboundStatusBadge,
    SalesInboundStatusBadge,
} from "@/components/sales-inbound-status-badge";
import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { DataSkeleton } from "@/components/data-skeleton";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { SalesCustomerEditButton } from "@/components/sales-customer-edit-button";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { middleTruncate } from "@/lib/truncate-middle";
import { openLink } from "@/lib/open-link";
import { formatDate } from "@/lib/use-day";
import { salesFormUrl } from "@/utils/sales-utils";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";

import { useSaleOverview } from "./context";
import { GeneralFooter } from "./general-footer";
import { SalesPO } from "./inline-data-edit";
import { GeneralActionBar } from "./general-action-bar";
import { cn } from "@gnd/ui/cn";
import { DeliveryOption } from "./delivery-option";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { SalesPrioritySelect } from "@/components/sales-priority-control";
import { SalesOverviewPaymentMethodSelect } from "@/components/sales-overview-payment-method-select";
import { SalesRepTransferControl } from "@/components/sales-rep-transfer-control";
import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";

type CostLine = {
    id?: number | string | null;
    label?: string | null;
    title?: string | null;
    amount?: number | null;
    value?: number | null;
};

function sumCostLineAmounts(costLines: CostLine[], targetLabel: string) {
    return costLines.reduce((sum, line) => {
        const label = (line.label || line.title || "").toLowerCase();
        if (label !== targetLabel.toLowerCase()) return sum;
        return sum + Number(line.amount || line.value || 0);
    }, 0);
}

export function GeneralTab({}) {
    const { data } = useSaleOverview();
    const query = useSalesOverviewQuery();
    const { setInventorySegment } = useSalesInventorySegmentQuery();
    const isQuote = data?.type === "quote";
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
            prodCompleted: {},
        },
    } as Partial<typeof data>;
    const saleData = data || ph;
    const invoiceTotal = Number(saleData?.invoice?.total || 0);
    const invoicePaid = Number(saleData?.invoice?.paid || 0);
    const invoicePending = Number(saleData?.invoice?.pending || 0);
    const costLines = (saleData?.costLines ?? []) as CostLine[];
    const cardPending = sumCostLineAmounts(costLines, "Total Due With C.C.C");
    const payableDue = Math.max(invoicePending, cardPending);
    const cccPending = Math.max(payableDue - invoicePending, 0);
    const paymentStatusLabel = payableDue > 0 ? "Due now" : "Settled";
    const paymentPercentage =
        invoiceTotal > 0
            ? (invoicePaid / invoiceTotal) * 100
            : 0;
    const productionPercentage = saleData?.stats?.prodCompleted?.percentage;
    const assignmentPercentage = saleData?.stats?.prodAssigned?.percentage;
    const assignmentStatus = saleData?.status?.assignment?.status ?? "pending";
    const assignmentStatusColor =
        saleData?.status?.assignment?.color ?? "warmGray";
    const productionStatus = saleData?.status?.production?.status ?? "pending";
    const productionStatusColor =
        saleData?.status?.production?.color ?? "warmGray";
    const deliveryStatus = saleData?.status?.delivery?.status ?? "pending";
    const deliveryStatusColor = saleData?.status?.delivery?.color ?? "warmGray";
    const dispatchCount = saleData?.dispatchList?.length ?? 0;
    const customerEmail = saleData?.email;
    const documentStatus = getSalesOverviewDocumentStatus(saleData);
    const hasInventoryInbound =
        !!saleData?.inventoryInboundOwnership?.hasInventoryInbound;
    const selectedInventoryInboundId = getSingleInventoryInboundId(
        saleData?.inventoryInboundOwnership,
    );
    const openInventoryInbounds = () => {
        if (!hasInventoryInbound) return;
        setInventorySegment("inbounds", {
            inboundId: selectedInventoryInboundId,
        });
        query.setParams({
            salesTab: "inventory",
        });
    };
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
                <div className="space-y-3">
                    <GeneralActionBar
                        salesNo={saleData?.orderId}
                        type={data?.type}
                        salesId={data?.id!}
                    />
                    {!isQuote ? (
                        <div className="flex justify-start">
                            <SalesPrioritySelect
                                salesId={data?.id}
                                orderId={saleData?.orderId}
                                priority={(saleData as any)?.priority}
                            />
                        </div>
                    ) : null}
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-6">
                        <div>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Icons.User className="h-4 w-4" />
                                    CUSTOMER INFORMATION
                                </h3>
                                <SalesCustomerEditButton
                                    customerId={saleData?.customerId}
                                    readOnly={Boolean(saleData?.isDealerSale)}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Icons.User className="mt-0.5 h-4 w-4 text-muted-foreground" />
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
                                                <Icons.ExternalLink className="ml-1 h-4 w-4" />
                                            </Button>
                                        </DataSkeleton>
                                        {saleData?.isBusiness && (
                                            <DataSkeleton
                                                className="text-sm text-muted-foreground"
                                                placeholder="Business"
                                            >
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Icons.Building className="h-3 w-3" />
                                                    <span>Business</span>
                                                </div>
                                            </DataSkeleton>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Icons.Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <DataSkeleton
                                        className="text-sm"
                                        placeholder="239-825-2782"
                                    >
                                        <span>{saleData?.customerPhone}</span>
                                    </DataSkeleton>
                                </div>

                                {customerEmail && (
                                    <div className="flex min-w-0 items-start gap-2">
                                        <Icons.Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                        <DataSkeleton
                                            className="min-w-0 text-sm"
                                            placeholder="customer@example.com"
                                        >
                                            <span
                                                className="block min-w-0 max-w-full overflow-hidden whitespace-nowrap"
                                                title={customerEmail}
                                            >
                                                {middleTruncate(customerEmail)}
                                            </span>
                                        </DataSkeleton>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Icons.Calendar className="h-4 w-4" />
                                {isQuote ? "QUOTE DETAILS" : "ORDER DETAILS"}
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">
                                            {isQuote ? "Quote Number" : "Order Number"}
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
                                                <Icons.ExternalLink className="ml-1 h-4 w-4" />
                                            </Button>
                                        </DataSkeleton>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">
                                            {documentStatus.labelText}
                                        </p>
                                        <DataSkeleton
                                            className="font-medium"
                                            placeholder={
                                                isQuote
                                                    ? "Open"
                                                    : "Awaiting production"
                                            }
                                        >
                                            <Badge
                                                variant="outline"
                                                className={documentStatus.className}
                                            >
                                                {documentStatus.label}
                                            </Badge>
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
                                    {!isQuote ? (
                                        <div>
                                            <p className="text-muted-foreground">
                                                Inbound Status
                                            </p>
                                            <DataSkeleton
                                                className="font-medium"
                                                placeholder="PENDING ORDER"
                                            >
                                                {hasInventoryInbound ? (
                                                    <InventoryInboundStatusBadge
                                                        ownership={
                                                            saleData?.inventoryInboundOwnership
                                                        }
                                                    />
                                                ) : (
                                                    <SalesInboundStatusBadge
                                                        status={saleData?.inboundStatus}
                                                        emptyFallback="No status"
                                                        title="Manual order status"
                                                    />
                                                )}
                                                {hasInventoryInbound ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="mt-1 h-6 px-0 text-[11px] text-primary hover:bg-transparent hover:underline"
                                                        onClick={openInventoryInbounds}
                                                    >
                                                        <Icons.ExternalLink className="mr-1 size-3" />
                                                        Open inbounds
                                                    </Button>
                                                ) : null}
                                            </DataSkeleton>
                                        </div>
                                    ) : null}
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
                                    {isQuote || (
                                        <div>
                                            <p className="text-muted-foreground">
                                                Delivery Option
                                            </p>

                                            <DeliveryOption
                                                salesId={saleData.id}
                                            />
                                        </div>
                                    )}
                                    <SalesPO
                                        salesId={saleData.id}
                                        value={saleData.poNo}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Icons.UserCheck className="h-4 w-4" />
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
                            <SalesRepTransferControl sale={saleData} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className={cn(!isQuote || "hidden")}>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Icons.CreditCardIcon className="h-4 w-4" />
                                PAYMENT STATUS
                            </h3>
                            <div className="space-y-3">
                                <Card className="border-border/40 bg-muted/20">
                                    <CardContent className="p-4">
                                        <div className="flex flex-wrap items-end justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                                    {paymentStatusLabel}
                                                </p>
                                                <DataSkeleton
                                                    as="div"
                                                    className="text-2xl font-bold"
                                                    placeholder="$0.00"
                                                >
                                                    <p
                                                        className={cn(
                                                            "mt-1 text-2xl font-bold",
                                                            payableDue > 0
                                                                ? "text-amber-600"
                                                                : "text-green-600",
                                                        )}
                                                    >
                                                        <Money value={payableDue} />
                                                    </p>
                                                </DataSkeleton>
                                            </div>
                                            <div className="text-right">
                                                <DataSkeleton
                                                    as="div"
                                                    className="text-sm font-semibold"
                                                    placeholder="0% settled"
                                                >
                                                    <p className="text-sm font-semibold">
                                                        {paymentPercentage.toFixed(0)}%
                                                        settled
                                                    </p>
                                                </DataSkeleton>
                                                <p className="text-xs text-muted-foreground">
                                                    <DataSkeleton
                                                        className="inline"
                                                        placeholder="$0.00"
                                                    >
                                                        <Money value={invoicePaid} />
                                                    </DataSkeleton>{" "}
                                                    paid of{" "}
                                                    <DataSkeleton
                                                        className="inline"
                                                        placeholder="$0.00"
                                                    >
                                                        <Money value={invoiceTotal} />
                                                    </DataSkeleton>
                                                </p>
                                            </div>
                                        </div>
                                        <DataSkeleton
                                            as="div"
                                            className="mt-4 h-2 w-full"
                                            placeholder=""
                                        >
                                            <Progress
                                                value={paymentPercentage}
                                                className="mt-4 h-2"
                                            />
                                        </DataSkeleton>
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            {cccPending > 0 ? (
                                                <>
                                                    <Money value={invoicePending} /> order
                                                    balance +{" "}
                                                    <Money value={cccPending} /> C.C.C
                                                </>
                                            ) : (
                                                <>
                                                    <Money value={invoicePending} /> order
                                                    balance remaining
                                                </>
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>
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
                                            <div className="text-sm font-medium">
                                                {formatDate(saleData.dueDate)}
                                            </div>
                                        </DataSkeleton>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {!(saleData.due && !isQuote) || (
                            <SalesPaymentProcessor
                                selectedIds={[saleData.id]}
                                phoneNo={saleData.customerPhone}
                                customerId={saleData?.customerId}
                            />
                            // <Button
                            //     className="w-full"
                            //     onClick={(e) => {
                            //         customerQuery.pay({
                            //             phoneNo: saleData.customerPhone,
                            //             orderId: saleData.id,
                            //             customerId: saleData.customerId,
                            //         });
                            //     }}
                            // >
                            //     <Icons.payment className="mr-2 size-4" />
                            //     Pay
                            // </Button>
                        )}
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Icons.FileText className="h-4 w-4" />
                                INVOICE DETAILS
                            </h3>
                            <Card className="border-border/40">
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        <SalesOverviewPaymentMethodSelect
                                            salesId={saleData?.id}
                                            value={saleData?.paymentMethod}
                                            disabled={
                                                isQuote ||
                                                Number(invoicePending || 0) <= 0
                                            }
                                            className="py-2"
                                        />
                                        {costLines.map((c, ci) => (
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
                                                        <Money value={c?.amount} />
                                                    </span>
                                                </DataSkeleton>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Icons.MapPin className="h-4 w-4" />
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

                <div className={cn(!isQuote || "hidden")}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Icons.Factory className="h-4 w-4" />
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
                                                className={`h-2 w-2 rounded-full ${getStatusColor(
                                                    assignmentStatusColor,
                                                )}`}
                                            ></div>
                                            <DataSkeleton
                                                className="text-xs font-medium"
                                                placeholder="Completed"
                                            >
                                                <span className="text-xs font-medium capitalize">
                                                    {assignmentStatus}
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
                                            {saleData?.stats?.prodAssigned?.score}
                                            /
                                            {saleData?.stats?.prodAssigned?.total}{" "}
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
                                                className={`h-2 w-2 rounded-full ${getStatusColor(
                                                    productionStatusColor,
                                                )}`}
                                            ></div>
                                            <DataSkeleton
                                                className="text-xs font-medium"
                                                placeholder="Pending"
                                            >
                                                <span className="text-xs font-medium capitalize">
                                                    {productionStatus}
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

                <div className={cn(!isQuote || "hidden")}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Icons.Package className="h-4 w-4" />
                        SHIPPING STATUS
                    </h3>
                    <Card className="border-border/40">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm">Delivery Status</span>
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`h-2 w-2 rounded-full ${getStatusColor(
                                            deliveryStatusColor,
                                        )}`}
                                    ></div>
                                    <DataSkeleton
                                        className="text-xs font-medium"
                                        placeholder="Pending"
                                    >
                                        <Badge
                                            variant={getStatusVariant(deliveryStatus)}
                                        >
                                            <span className="capitalize">
                                                {deliveryStatus}
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
                                    {dispatchCount > 0
                                        ? `${dispatchCount} dispatch entries available`
                                        : "No dispatch information available"}
                                </p>
                            </DataSkeleton>
                        </CardContent>
                    </Card>
                </div>
                <GeneralFooter />
            </div>
        </DataSkeletonProvider>
    );
}
