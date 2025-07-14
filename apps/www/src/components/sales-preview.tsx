import { Env } from "@/components/env";
import { getSalesPrintData } from "@/app/(v2)/printer/sales/get-sales-print-data";
import { OrderBasePrinter } from "@/app/(v2)/printer/sales/order-base-printer";
import SalesPrintDisplay from "@/app/(v2)/printer/sales/sales-print-display";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { rndTimeout } from "@/lib/timeout";
import { SalesInvoicePdfTemplate } from "@gnd/printer/templates/sales-invoice";
import { useAsyncMemo } from "use-async-memo";

export function SalesPreview({}) {
    const { params, opened, setParams } = useSalesPreview();
    const response = useAsyncMemo(async () => {
        if (opened) {
            await rndTimeout();
            const {} = params;
            const resp = await getSalesPrintData(params.salesPreviewSlug, {
                mode: params.previewMode,
                preview: true,
                dispatchId: params?.dispatchId,
            });
            return { data: resp };
        }
        return {} as any;
    }, [opened, params]);
    if (!response?.data) return null;
    const { data } = response;
    return (
        <div className="">
            <OrderBasePrinter mode={params?.previewMode as any}>
                <Env isDev>
                    <SalesInvoicePdfTemplate
                        printData={{
                            sale: data,
                            mode: params?.previewMode,
                        }}
                    />
                </Env>
                <SalesPrintDisplay data={data} slug={params.salesPreviewSlug} />
            </OrderBasePrinter>
        </div>
    );
}

