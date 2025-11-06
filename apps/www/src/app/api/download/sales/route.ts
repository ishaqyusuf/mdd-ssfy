import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { renderToStream } from "@gnd/community";
import { z } from "zod";
import { generateLegacyPrintData } from "@sales/print-legacy-format";
import { PdfTemplate } from "@sales/templates/pdf";
import { validateTokenAction } from "@/actions/token-action";
import { notFound } from "next/navigation";
import { db } from "@gnd/db";
import sharp from "sharp";
const paramsSchema = z.object({
    // id: z.string().uuid().optional(),
    // token: z.string().optional(),
    // slugs: z.array(z.number()),
    token: z.string(),
    // templateSlug: z.string().optional().nullable(),
    preview: z.preprocess((val) => val === "true", z.boolean().default(false)),
});
export async function GET(req: NextRequest) {
    const requestUrl = new URL(req.url);
    // const session = await getServerSession(authOptions);
    const result = paramsSchema.safeParse(
        Object.fromEntries(requestUrl.searchParams.entries())
    );
    const payload = await validateTokenAction(
        result.data.token,
        "salesPdfToken"
    );

    if (!payload) notFound();
    const printData = await generateLegacyPrintData(db, payload);
    const title = printData.map((a) => a.orderNo).join("-");
    const safeTitle = title.replace(/[^\w\-]+/g, "_");
    const {
        // id, token,
        preview,
    } = result.data;

    // Point to your local file (e.g., in public folder)
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const pages = printData.map((a) => a.pageData);
    const watermark = await (async () => {
        try {
            const buffer = await sharp(
                // `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`
                logoPath
            )
                .grayscale()
                .toBuffer();
            return `data:image/png;base64,${buffer.toString("base64")}`;
        } catch (error) {}
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
        })
    );
    if (!stream) {
        return NextResponse.json(
            { error: "Failed to render PDF stream" },
            { status: 500 }
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
        headers[
            "Content-Disposition"
        ] = `attachment; filename="${safeTitle}.pdf"`;
    } else {
        headers["Content-Disposition"] = `inline; filename="${safeTitle}.pdf"`;
    }

    return new Response(blob, { headers });
}

