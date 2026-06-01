"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfTemplate } from "@gnd/pdf/sales";

export function PrintSales() {
    const trpc = useTRPC();
    const { filters, setFilters } = useSalesPrintFilter();
    // filters.slugs.
    const {
        data: printData,
        error,
        isPending,
    } = useSuspenseQuery(
        trpc.print.sales.queryOptions({
            ...filters,
        }),
    );
    const viewerRef = useRef<any>(null);

    useEffect(() => {
        // viewerRef?.current?.print();
        // console.log({ viewerRef });
        if (filters.preview) return;
        setTimeout(() => {
            viewerRef.current?.contentWindow?.print();
        }, 3000);
    }, [viewerRef]);

    return (
        <>
            <PDFViewer
                // width="100%"
                // height="100%"
                ref={viewerRef}
                className="flex flex-col w-full h-screen"
            >
                <SalesPdfTemplate
                    // onRender={onRender}
                    baseUrl={process.env.NEXT_PUBLIC_APP_URL}
                    {...((printData as any) || {})}
                />
            </PDFViewer>
        </>
    );
}
