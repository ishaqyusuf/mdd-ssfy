import { NextRequest } from "next/server";

import { PdfTemplate, renderToStream } from "@gnd/community";
import { z } from "zod";
import { db } from "@gnd/db";
import { generatePrintData } from "@community/generate-print-data";
import { consoleLog } from "@gnd/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
const paramsSchema = z.object({
    // id: z.string().uuid().optional(),
    // token: z.string().optional(),
    // slugs: z.array(z.number()),
    slugs: z.string(),
    templateSlug: z.string().optional().nullable(),

    preview: z.preprocess((val) => val === "true", z.boolean().default(false)),
});
// export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
    const requestUrl = new URL(req.url);
    const session = await getServerSession(authOptions);
    const result = paramsSchema.safeParse(
        Object.fromEntries(requestUrl.searchParams.entries()),
    );
    const printData = await generatePrintData(db, {
        homeIds: result.data.slugs
            ?.split(",")
            .map((a) => Number(a))
            .filter((a) => a > 0),
        templateSlug: result.data.templateSlug,
    });

    const {
        // id, token,
        preview,
    } = result.data;

    const stream = await renderToStream(
        await PdfTemplate({
            units: printData.units,
            url: requestUrl,
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
            `attachment; filename="${printData.title}.pdf"`;
    }

    return new Response(blob, { headers });
}

