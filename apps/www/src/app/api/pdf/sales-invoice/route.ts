import { NextRequest, NextResponse } from "next/server";
import { getSalesPrintData } from "@/app/(v2)/printer/sales/get-sales-print-data";
import { apiParamsTokV } from "@/utils/api-params-to-kv";
import { renderToBuffer } from "@react-pdf/renderer";

import { SalesInvoicePdfTemplate } from "@gnd/printer/templates/sales-invoice";

export async function GET(req: NextRequest, res) {
    const params = apiParamsTokV(req.nextUrl.searchParams);
    const fileName = params?.slug;
    const data = await getSalesPrintData(fileName, {
        mode: "order",
        preview: true,
    });
    // return NextResponse.json(data);
    const buffer = await renderToBuffer(
        SalesInvoicePdfTemplate({
            printData: {
                sale: data,
                mode: "order",
            },
        }),
    );
    const responseHeaders = new Headers(res.headers);
    responseHeaders.set(
        "Content-Disposition",
        `attachment; filename="${fileName}.pdf"`,
    );
    return new Response(buffer as any, {
        headers: responseHeaders,
    });
}
