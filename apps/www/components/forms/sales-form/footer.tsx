import { openSalesOverview } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { Button } from "@gnd/ui/button";

import { SalesFormSave } from "./sales-form-save";

export function Footer({}) {
    const zus = useFormDataStore();
    let amountDue = zus.metaData.pricing?.dueAmount;
    const customerQuery = useCustomerOverviewQuery();

    const overviewQuery = useSalesOverviewQuery();
    return (
        <div className="border-t pt-2">
            <div className="flex justify-end gap-4">
                {
                    <Button
                        onClick={() => {
                            customerQuery.pay({
                                phoneNo: zus.metaData.primaryPhone,
                                customerId: zus.metaData.customer.id,
                                orderId: zus.metaData.id,
                            });
                        }}
                        size="xs"
                        disabled={!amountDue || !zus.metaData.salesId}
                    >
                        <Icons.dollar className="mr-2 size-4" />
                        <Money value={amountDue}></Money>
                    </Button>
                }
                <Button
                    disabled={!zus.metaData.id}
                    onClick={() => {
                        overviewQuery.open2(
                            zus.metaData?.salesId,
                            zus.metaData?.type as any,
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
