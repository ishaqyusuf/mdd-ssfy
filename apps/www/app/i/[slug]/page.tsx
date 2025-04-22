"use client";

import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SalesPrintProps } from "@/app/(v2)/printer/sales/page";
import { env } from "@/env.mjs";
import QueryString from "qs";

export default function Page({}) {
    const searchParams = useSearchParams();
    const params = useParams();

    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return; // prevent second run
        hasRun.current = true; // mark as run

        async function download() {
            // const pdf = await salesPdf(query);
            const query = {
                slugs: params.slug,
                mode: searchParams.get("mode"),
                preview: false,
                ...(params || {}),
            } as SalesPrintProps["searchParams"];

            const pdf = await fetch(
                `${
                    env.NEXT_PUBLIC_NODE_ENV == "production"
                        ? ""
                        : "https://gnd-prodesk.vercel.app"
                }/api/pdf/sales?${QueryString.stringify(query)}`,
            ).then((res) => res.json());
            console.log(pdf);
            const link = document.createElement("a");
            // link.href = pdf.url;
            const downloadUrl = pdf.url.replace(
                "/fl_attachment/",
                `/fl_attachment:${query.slugs}/`,
            ); //+ `/${query.slugs}.pdf`;

            link.href = downloadUrl;
            link.download = `${query.slugs}.pdf`;
            link.click();
            setTimeout(() => {
                window.close();
            }, 1000);
        }

        download();
    }, []); // empty dependency array

    return null;
}
