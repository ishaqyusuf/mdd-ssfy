import { getCustomerStatementPrintData } from "@gnd/api/db/queries/customer-statement-print";
import { db } from "@gnd/db";
import { renderCustomerStatementPdfBuffer } from "@gnd/pdf/customer-statement";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

function sanitizeFilename(value: string) {
	return value
		.replace(/[^\w\-]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 120);
}

function createPdfResponse(input: {
	buffer: Buffer;
	title: string;
	preview: boolean;
}) {
	const headers: Record<string, string> = {
		"Content-Type": "application/pdf",
		"Cache-Control": "no-store, max-age=0",
	};
	const filename = `${sanitizeFilename(input.title) || "Customer_Statement"}.pdf`;

	headers["Content-Disposition"] = input.preview
		? `inline; filename="${filename}"`
		: `attachment; filename="${filename}"`;

	const body = input.buffer.buffer.slice(
		input.buffer.byteOffset,
		input.buffer.byteOffset + input.buffer.byteLength,
	) as ArrayBuffer;

	return new Response(body, { headers });
}

export async function GET(req: NextRequest) {
	const requestUrl = new URL(req.url);
	const token = requestUrl.searchParams.get("token");
	const preview = requestUrl.searchParams.get("preview") === "true";
	const templateId = requestUrl.searchParams.get("templateId") || "template-1";

	if (!token) {
		return NextResponse.json(
			{ error: "Missing customer statement token" },
			{ status: 400 },
		);
	}

	const payload = validateToken(token, tokenSchemas.customerStatementPdfToken);
	if (!payload) notFound();

	const statementData = await getCustomerStatementPrintData(db, {
		customerId: payload.customerId,
		salesIds: payload.salesIds,
	});
	const printedDate = new Date(statementData.printedAt);
	const dateLabel = Number.isNaN(printedDate.getTime())
		? new Date().toISOString().slice(0, 10)
		: printedDate.toISOString().slice(0, 10);
	const title = `Statement_${statementData.customer.displayName}_${dateLabel}`;
	const buffer = await renderCustomerStatementPdfBuffer({
		data: statementData,
		templateId: payload.templateId || templateId,
		baseUrl: requestUrl.origin,
		logoUrl: statementData.logoUrl,
		watermarkText: "Customer Statement",
		title,
	});

	return createPdfResponse({
		buffer,
		title,
		preview,
	});
}
