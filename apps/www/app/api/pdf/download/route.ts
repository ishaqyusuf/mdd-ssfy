import { NextRequest } from "next/server";
import { salesPdf } from "@/app/(v2)/printer/_action/sales-pdf";
import { SalesPrintProps } from "@/app/(v2)/printer/sales/page";
import { prisma } from "@/db";
import { apiParamsTokV } from "@/utils/api-params-to-kv";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = apiParamsTokV(
        req.nextUrl.searchParams,
    ) as any as SalesPrintProps["searchParams"];
    console.log({ query });

    const id = req.nextUrl.searchParams.get("id");
    // const order = await prisma.salesOrders.findFirstOrThrow({
    //     where: {
    //         id: Number(id),
    //         slug: query.slugs,
    //     },
    // });
    const pdf = await salesPdf(query);

    const res = await fetch(pdf.url); // fetch actual pdf content
    const pdfBuffer = await res.arrayBuffer();

    return new Response(pdfBuffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${query.slugs}.pdf"`,
        },
    });
}
