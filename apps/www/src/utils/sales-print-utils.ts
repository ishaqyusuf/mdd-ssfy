import { env } from "@/env.mjs";
import { openLink } from "@/lib/open-link";
import { IOrderPrintMode } from "@/types/sales";
import QueryString from "qs";

interface Props extends SalesPrintProps {}
export type SalesPrintProps = {
    slugs?: string;
    mode: IOrderPrintMode;
    mockup?: "yes" | "no";
    preview?: boolean;
    pdf?: boolean;
    deletedAt?;
    dispatchId?;
};
export async function printSalesData(props: Props) {
    if (!props.pdf) openLink(`/printer/sales`, props, true);
    else {
        const pdf = await fetch(
            `${
                env.NEXT_PUBLIC_NODE_ENV == "production"
                    ? ""
                    : "https://gnd-prodesk.vercel.app"
            }/api/pdf/sales?${QueryString.stringify(props)}`,
        ).then((res) => res.json());
        const link = document.createElement("a");
        // link.href = pdf.url;
        const downloadUrl = pdf.url.replace(
            "/fl_attachment/",
            `/fl_attachment:${props.slugs}/`,
        ); //+ `/${query.slugs}.pdf`;

        link.href = downloadUrl;
        link.download = `${props.slugs}.pdf`;
        link.click();
    }
}
// export async function printSales(params?:);
