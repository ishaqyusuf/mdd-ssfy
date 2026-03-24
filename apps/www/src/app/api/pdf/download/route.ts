import { salesPdf } from "@/app-deps/(v2)/printer/_action/sales-pdf";
import { apiParamsTokV } from "@/utils/api-params-to-kv";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const query = apiParamsTokV(req.nextUrl.searchParams);
	const preview = query.preview === "true";
	const pdf = await salesPdf(query);
	const res = await fetch(pdf.url);
	if (!res.ok) {
		return NextResponse.json(
			{ error: "Failed to download sales PDF" },
			{ status: 500 },
		);
	}
	const blob = await res.blob();
	const safeTitle = String(query.slugs || "sales-print").replace(
		/[^\w\-]+/g,
		"_",
	);

	const headers: Record<string, string> = {
		"Content-Type": "application/pdf",
		"Cache-Control": "no-store, max-age=0",
	};

	if (!preview) {
		headers["Content-Disposition"] = `attachment; filename="${safeTitle}.pdf"`;
	} else {
		headers["Content-Disposition"] = `inline; filename="${safeTitle}.pdf"`;
	}

	return new Response(blob, { headers });
}
