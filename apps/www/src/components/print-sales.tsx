"use client";

import { _trpc } from "./static-trpc";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfTemplate } from "@gnd/pdf/sales";

export function PrintSales() {
    const { filters, setFilters } = useSalesPrintFilter();
    // filters.slugs.
    const {
        data: printData,
        error,
        isPending,
    } = useSuspenseQuery(
        _trpc.print.sales.queryOptions({
            ...filters,
        })
    );
    const viewerRef = useRef<HTMLIFrameElement>(null);
    // useEffect(() => {
    //     if (isPending) return;
    //     if (printData)
    //         setTimeout(() => {
    //             window.print();
    //         }, 2000);
    // }, [printData, isPending]);
    // const handleReady = () => {
    //     // Wait for PDF to fully mount inside iframe
    //     setTimeout(() => {
    //         viewerRef.current?.contentWindow?.print();
    //     }, 300);
    // };
    // if (isPending)

    return (
        <>
            <PDFViewer
                // ref={viewerRef}
                // width="100%"
                // height="100%"
                // onRenderSuccess={handleReady}
                className="flex flex-col w-full h-screen"
            >
                <SalesPdfTemplate
                    baseUrl={process.env.NEXT_PUBLIC_APP_URL}
                    {...((printData as any) || {})}
                />
            </PDFViewer>
        </>
    );
}

