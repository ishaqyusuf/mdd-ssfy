"use client";

import { useEffect, useState } from "react";
import DevOnly from "@/_v2/components/common/dev-only";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { getSalesPrintData } from "@/app/(v2)/printer/sales/get-sales-print-data";
import { OrderBasePrinter } from "@/app/(v2)/printer/sales/order-base-printer";
import SalesPrintDisplay from "@/app/(v2)/printer/sales/sales-print-display";
import {
    parseAsBoolean,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { SalesInvoicePdfTemplate } from "@gnd/printer/templates/sales-invoice";
import { Dialog, DialogContent } from "@gnd/ui/dialog";

import { ScrollArea } from "@gnd/ui/scroll-area";

export function useSalesPreviewModal() {
    const [q, setQ] = useQueryStates({
        salesPreviewSlug: parseAsString,
        salesPreviewType: parseAsStringEnum(["order", "quote"] as SalesType[]),
        previewModal: parseAsBoolean,
    });

    return {
        q,
        isOpened: q.salesPreviewSlug != null && q.previewModal,
        preview(id, salesPreviewType: typeof q.salesPreviewType) {
            setQ({
                salesPreviewSlug: id,
                salesPreviewType,
                previewModal: true,
            });
        },
        close() {
            setQ(null);
        },
    };
}
export function SalesPreviewModal({}) {
    const ctx = useSalesPreviewModal();
    const [data, setData] = useState(null as any);
    useEffect(() => {
        if (ctx.q.salesPreviewSlug) {
            getSalesPrintData(ctx.q.salesPreviewSlug, {
                mode: ctx.q.salesPreviewType,
                preview: true,
            }).then((result) => {
                console.log({ result });

                setData(result as any);
            });
        }
    }, [ctx.q.salesPreviewSlug]);
    return (
        <Dialog
            onOpenChange={(e) => {
                ctx.close();
            }}
            open={ctx.isOpened}
        >
            <DialogContent className="w-[800px]s max-w-4xl">
                <ScrollArea className="h-[90vh] overflow-auto">
                    {data && (
                        <OrderBasePrinter mode={ctx.q.salesPreviewType as any}>
                            <DevOnly>
                                <SalesInvoicePdfTemplate
                                    printData={{
                                        sale: data,
                                        mode: ctx.q.salesPreviewType as any,
                                    }}
                                />
                            </DevOnly>
                            <SalesPrintDisplay
                                data={data}
                                slug={ctx.q.salesPreviewSlug}
                            />
                        </OrderBasePrinter>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
