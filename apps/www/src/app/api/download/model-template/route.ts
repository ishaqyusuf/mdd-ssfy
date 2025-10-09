import { NextRequest } from "next/server";

import { PdfTemplate, renderToStream } from "@gnd/community";
import { z } from "zod";
import { db } from "@gnd/db";
import { generatePrintData } from "@community/generate-print-data";
const paramsSchema = z.object({
    id: z.string().uuid().optional(),
    token: z.string().optional(),
    preview: z.preprocess((val) => val === "true", z.boolean().default(false)),
});
export async function GET(req: NextRequest) {
    const requestUrl = new URL(req.url);

    const result = paramsSchema.safeParse(
        Object.fromEntries(requestUrl.searchParams.entries()),
    );
    const printData = await generatePrintData(db, {});
    const { id, token, preview } = result.data;
    const data = {
        title: "756547AB",
    };
    const stream = await renderToStream(
        await PdfTemplate({
            template: {
                size: "A4",
            },
        }),
    );

    // @ts-expect-error - stream is not assignable to BodyInit
    const blob = await new Response(stream).blob();

    const headers: Record<string, string> = {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, max-age=0",
    };

    if (!preview) {
        headers["Content-Disposition"] =
            `attachment; filename="${data.title}.pdf"`;
    }

    return new Response(blob, { headers });
}

