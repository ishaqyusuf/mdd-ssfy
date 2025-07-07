import DevOnly from "@/_v2/components/common/dev-only";
import { getSalesPrintData } from "@/app/(v2)/printer/sales/get-sales-print-data";
import { OrderBasePrinter } from "@/app/(v2)/printer/sales/order-base-printer";
import SalesPrintDisplay from "@/app/(v2)/printer/sales/sales-print-display";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { rndTimeout, timeout } from "@/lib/timeout";
import { SalesInvoicePdfTemplate } from "@gnd/printer/templates/sales-invoice";
import { useAsyncMemo } from "use-async-memo";

export function SalesPreview({}) {
    const { params, opened, setParams } = useSalesPreview();
    const { data } = useAsyncMemo(async () => {
        if (opened) {
            await rndTimeout();
            const {} = params;
            const resp = await getSalesPrintData(params.salesPreviewSlug, {
                mode: params.previewMode,
                preview: true,
            });
            return { data: resp };
        }
        return {} as any;
    }, [opened, params]);
    if (!data) return null;
    return (
        <div className="">
            <OrderBasePrinter mode={params?.previewMode as any}>
                <DevOnly>
                    <SalesInvoicePdfTemplate
                        printData={{
                            sale: data,
                            mode: params?.previewMode,
                        }}
                    />
                </DevOnly>
                <SalesPrintDisplay data={data} slug={params.salesPreviewSlug} />
            </OrderBasePrinter>
        </div>
    );
}

