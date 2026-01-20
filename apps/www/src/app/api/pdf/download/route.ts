import { NextRequest, NextResponse } from "next/server";
import { salesPdf } from "@/app-deps/(v2)/printer/_action/sales-pdf";
import { SalesPrinterProps } from "@/app-deps/(v2)/printer/type";
import { prisma } from "@/db";
import { apiParamsTokV } from "@/utils/api-params-to-kv";
import { generateLegacyPrintData } from "@sales/print-legacy-format";
import { renderToStream } from "@gnd/community";
import { PdfTemplate } from "@sales/templates/pdf";
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = apiParamsTokV(req.nextUrl.searchParams) as any;

    const orders = await prisma.salesOrders.findMany({
        where: {
            slug: {
                in: query?.slugs?.split(","),
            },
            type: query?.mode === "quote" ? "quote" : "order",
        },
        select: {
            id: true,
            type: true,
        },
    });

    const printData = await generateLegacyPrintData(prisma, {
        expiry: "",
        mode: query?.mode,
        salesIds: orders.map((a) => a.id),
    });
    const title = printData.map((a) => a.orderNo).join("-");
    const safeTitle = title.replace(/[^\w\-]+/g, "_");
    // const {
    //     // id, token,
    //     preview,
    // } = result.data;
    const preview = query.preview === "true";

    // Point to your local file (e.g., in public folder)
    const pages = printData.map((a) => a.pageData);
    const watermark = await (async () => {
        // try {
        //     const logoPath = path.join(process.cwd(), "public", "logo.png");
        //     const buffer = await sharp(logoPath).grayscale().toBuffer();
        //     return `data:image/png;base64,${buffer.toString("base64")}`;
        // } catch (error) {}
        return null;
    })();

    const stream = await renderToStream(
        await PdfTemplate({
            pages,
            watermark,
            title: safeTitle,
            template: {
                size: "A4",
            },
        }),
    );
    if (!stream) {
        return NextResponse.json(
            { error: "Failed to render PDF stream" },
            { status: 500 },
        );
    }
    // return NextResponse.json({ data: "Testing Sentry Error...!", printData });

    // @ts-expect-error - stream is not assignable to BodyInit
    const blob = await new Response(stream).blob();

    const headers: Record<string, string> = {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, max-age=0",
    };

    if (!preview) {
        headers["Content-Disposition"] =
            `attachment; filename="${safeTitle}.pdf"`;
    } else {
        headers["Content-Disposition"] = `inline; filename="${safeTitle}.pdf"`;
    }

    return new Response(blob, { headers });

    // const pdf = await salesPdf(query);

    // const res = await fetch(pdf.url); // fetch actual pdf content
    // const pdfBuffer = await res.arrayBuffer();

    // return new Response(pdfBuffer, {
    //     headers: {
    //         "Content-Type": "application/pdf",
    //         "Content-Disposition": `attachment; filename="${query.slugs}.pdf"`,
    //     },
    // });
}
