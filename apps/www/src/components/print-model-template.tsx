"use client";

import { useModelTemplatePrintFilterParams } from "@/hooks/use-model-template-print-filter-params";
import { _trpc } from "./static-trpc";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { PDFViewer } from "@community/index";
import { useEffect, useRef } from "react";
import { PdfTemplate } from "@community/index";

export function PrintModelTemplate() {
    const { filters, setFilters } = useModelTemplatePrintFilterParams();
    // filters.slugs.
    const { data: printData, isPending } = useSuspenseQuery(
        _trpc.print.modelTemplate.queryOptions({
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
                <PdfTemplate
                    units={printData?.units}
                    url={""}
                    title={printData?.title}
                    template={{
                        size: "A4",
                    }}
                />
            </PDFViewer>
        </>
    );
}

