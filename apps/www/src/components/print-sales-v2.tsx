"use client";

import { _trpc } from "./static-trpc";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSalesPrintFilter } from "@/hooks/use-sales-print-filter";
import { getBaseUrl } from "@/lib/base-url";
import { PDFViewer } from "@gnd/pdf";
import { SalesPdfDocument } from "@gnd/pdf/sales-v2";

export function PrintSalesV2() {
    const { filters } = useSalesPrintFilter();
    const { data } = useSuspenseQuery(
        _trpc.print.salesV2.queryOptions({
            token: filters.token ?? "",
            preview: filters.preview ?? false,
        }),
    );
    const viewerRef = useRef<any>(null);

    useEffect(() => {
        if (filters.preview) return;
        setTimeout(() => {
            viewerRef.current?.contentWindow?.print();
        }, 3000);
    }, [filters.preview]);

    if (!data) return null;

    return (
        <PDFViewer ref={viewerRef} className="flex flex-col w-full h-screen">
            <SalesPdfDocument
                pages={data.pages}
                templateId={data.templateId}
                title={data.title}
                companyAddress={data.companyAddress}
                watermark={data.watermark ?? undefined}
                baseUrl={getBaseUrl()}
            />
        </PDFViewer>
    );
}

