"use client";

import { WaterMark } from "@/components/_v1/print/order/water-mark";
import { adjustWatermark } from "@/lib/adjust-watermark";
import { timeout } from "@/lib/timeout";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import "./style.css";
type PagesProps = {
    [slug in string]: {
        ready: boolean;
        data: any;
    };
};
interface Props {
    // pages: PagesProps;
    getData(slug);
    pageReady(slug, pageData);
}
export const PrintCtx = React.createContext<Props>({
    // pages: {},
} as any);
export const usePrintContext = () => React.useContext<Props>(PrintCtx);
interface BasPrinterProps {
    slugs: string[];
    children?;
    preview?;
    pdf?;
}
export default function BasePrinter({
    slugs,
    children,
    preview = false,
    pdf,
}: BasPrinterProps) {
    const defaultValues = {};
    slugs.map((s) => (defaultValues[s] = { ready: false }));
    // const [pages,setPages] = useState(defaultValues)
    const form = useForm<PagesProps>({
        defaultValues,
    });
    const pages = form.watch();
    useEffect(() => {
        // if(!params.values.preview)
        // {

        // }
        // console.log(params.get("preview"));
        const slugs = Object.keys(pages);
        // console.log(pages);

        if (Object.values(pages).every((p) => p.ready) && !preview && !pdf) {
            // console.log("ADJUSTING WATERMARKS");
            // adjustWatermark(slugs);
            (async () => {
                await timeout(900);
                window.print();
                window.close();
            })();
        }
        // console.log(pages);
    }, [pages]);
    function pageReady(slug, pageData) {
        setTimeout(() => {
            form.setValue(`${slug}.ready`, true);
            form.setValue(`${slug}.data`, pageData);
        }, 500);
    }
    function getData(slug) {
        return form.getValues(slug);
    }
    // let doc = document;
    let [doc, setDocument] = useState(null);
    useEffect(() => {
        setDocument(document);
    }, []);

    if (!doc) return;
    return createPortal(
        <PrintCtx.Provider value={{ pageReady, getData }}>
            <div className="printly">
                {children}
                <WaterMark />
            </div>
        </PrintCtx.Provider>,
        doc?.body,
    ) as any;
}
