import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Button } from "@gnd/ui/button";
import { SalesFormSave } from "./sales-form-save";
import { sum } from "@/lib/utils";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";

export function Footer({}) {
    const zus = useFormDataStore();
    let amountDue = zus.metaData.pricing?.dueAmount;
    const customerQuery = useCustomerOverviewQuery();
    const amount = sum([
        zus?.metaData?.pricing?.grandTotal,
        -1 * zus?.metaData?.pricing?.paid,
    ]);
    const overviewQuery = useSalesOverviewQuery();

    return (
        <div className="border-t pt-2">
            <div className="flex justify-end gap-4">
                {zus?.metaData?.type == "order" && (
                    <SalesPaymentProcessor
                        phoneNo={zus.metaData.primaryPhone}
                        selectedIds={[zus.metaData.id]}
                        customerId={zus.metaData.customer.id}
                        disabled={!amount || !zus.metaData.salesId}
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

                <Button
                    disabled={!zus.metaData.id}
                    onClick={() => {
                        overviewQuery.open2(
                            zus.metaData?.salesId,
                            zus.metaData.type == "order" ? "sales" : "quote",
                        );
                        // openSalesOverview({
                        //     salesId: zus.metaData.id,
                        // });
                    }}
                    size="xs"
                    variant="outline"
                >
                    <span>Overview</span>
                </Button>
                <SalesFormSave type="button" />
            </div>
        </div>
    );
}
