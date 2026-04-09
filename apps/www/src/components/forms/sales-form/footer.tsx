import { Icons } from "@gnd/ui/icons";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Button } from "@gnd/ui/button";
import { SalesFormSave } from "./sales-form-save";
import { sum } from "@/lib/utils";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { AnimatedNumber } from "@/components/animated-number";
import { printOrder, printQuote } from "@/lib/quick-print";

export function Footer({}) {
    const zus = useFormDataStore();
    const previewId = zus?.metaData?.id || zus?.metaData?.salesId;
    const isSaved = !!previewId;
    const isOrder = zus?.metaData?.type == "order";
    const amount = sum([
        zus?.metaData?.pricing?.grandTotal,
        -1 * zus?.metaData?.pricing?.paid,
    ]);
    const overviewQuery = useSalesOverviewQuery();

    return (
        <div className="space-y-3">
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Total
                </p>
                <p className="text-2xl font-black leading-tight text-foreground">
                    <AnimatedNumber
                        value={zus?.metaData?.pricing?.grandTotal || 0}
                    />
                </p>
            </div>
            <div className="flex justify-end gap-3">
                {isSaved && isOrder && (
                    <SalesPaymentProcessor
                        phoneNo={zus.metaData.primaryPhone}
                        selectedIds={[zus.metaData.id]}
                        customerId={zus.metaData.customer.id}
                        disabled={!amount || !zus.metaData.salesId}
                        buttonProps={{
                            size: "sm",
                        }}
                    />
                )}
                {/* <Button
                    onClick={() => {
                        customerQuery.pay({
                            phoneNo: zus.metaData.primaryPhone,
                            customerId: zus.metaData.customer.id,
                            orderId: zus.metaData.id,
                        });
                    }}
                    size="xs"
                    disabled={!amount || !zus.metaData.salesId}
                >
                    <Icons.dollar className="mr-2 size-4" />
                    <Money value={amount}></Money>
                </Button> */}

                {!isSaved || (
                    <>
                        <Button
                            type="button"
                            size="sm"
                            onClick={async () => {
                                if (!previewId) return;
                                if (isOrder) {
                                    await printOrder({ salesIds: [previewId] });
                                    return;
                                }
                                await printQuote({ salesIds: [previewId] });
                            }}
                        >
                            <Icons.Printer className="mr-1 h-4 w-4" />
                            Print
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                overviewQuery.open2(
                                    zus.metaData?.salesId,
                                    zus.metaData.type == "order"
                                        ? "sales"
                                        : "quote",
                                );
                            }}
                            size="sm"
                            variant="secondary"
                        >
                            <span>Overview</span>
                        </Button>
                    </>
                )}
                <SalesFormSave type="button" />
            </div>
        </div>
    );
}
