"use client";

import { SalesPrintProps } from "./page";
import { salesPdf } from "../_action/sales-pdf";
import { toast } from "sonner";

export default function useSalesPdf() {
    async function print(query: SalesPrintProps["searchParams"]) {
        const pdf = await salesPdf(query);
        const link = document.createElement("a");
        link.href = pdf.url;
        console.log({ url: pdf.url });
        link.download = `${query.slugs}.pdf`;
        link.click();
        toast.success("Pdf Exported!.");
    }
    return {
        print,
    };
}
