import { NextRequest, NextResponse } from "next/server";

import { renderToStream } from "@gnd/community";
import { z } from "zod";
import { generateLegacyPrintData } from "@sales/print-legacy-format";
import { PdfTemplate } from "@sales/templates/pdf";
import { validateTokenAction } from "@/actions/token-action";
import { notFound } from "next/navigation";
import { db } from "@gnd/db";
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

    const {
        // id, token,
        preview,
    } = result.data;
    try {
        const pages = printData.map((a) => a.pageData);

        const stream = await renderToStream(
            await PdfTemplate({
                pages,
                template: {
                    size: "A4",
                },
            })
        );
    } catch (error) {}
    return NextResponse.json({ data: "Testing Sentry Error...!", printData });
    const title = printData.map((a) => a.orderNo).join("-");
    // @ts-expect-error - stream is not assignable to BodyInit
    const blob = await new Response(stream).blob();

    const headers: Record<string, string> = {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, max-age=0",
    };

    if (!preview) {
        headers["Content-Disposition"] = `attachment; filename="${title}.pdf"`;
    }

    return new Response(blob, { headers });
}

