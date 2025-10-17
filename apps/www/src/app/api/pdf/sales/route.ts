import { salesPdf } from "@/app/(v2)/printer/_action/sales-pdf";
import { apiParamsTokV } from "@/utils/api-params-to-kv";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const query = apiParamsTokV(req.nextUrl.searchParams);

    const pdf = await salesPdf(query as any);

    return Response.json(pdf);
}
