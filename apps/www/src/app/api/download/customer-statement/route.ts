import { DEFAULT_SALES_PRINT_TEMPLATE_ID } from "@/modules/sales-print/application/sales-print-request";
import { getCustomerStatementPrintData } from "@gnd/api/db/queries/customer-statement-print";
import { db } from "@gnd/db";
import {
	renderCustomerStatementPdfBuffer,
	renderCustomerStatementWithSalesInvoicesPdfBuffer,
} from "@gnd/pdf/customer-statement";
import { getPrintDocumentData } from "@gnd/sales/print";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

function resolvePdfBaseUrl(requestUrl: URL) {
	const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
	if (!configuredBaseUrl) return requestUrl.origin;

	try {
		const configuredUrl = new URL(configuredBaseUrl);
		const configuredIsLocalhost = ["localhost", "127.0.0.1"].includes(
			configuredUrl.hostname,
		);
		const requestIsLocalhost = ["localhost", "127.0.0.1"].includes(
			requestUrl.hostname,
		);

		if (
			configuredIsLocalhost &&
			requestIsLocalhost &&
			!configuredUrl.port &&
			requestUrl.port
		) {
			return requestUrl.origin;
		}

		return configuredUrl.origin;
	} catch {
		return requestUrl.origin;
	}
}

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
	const pdfBaseUrl = resolvePdfBaseUrl(requestUrl);
	const salesTemplateId =
		requestUrl.searchParams.get("salesTemplateId") ||
		DEFAULT_SALES_PRINT_TEMPLATE_ID;

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
	const selectedSalesIds = statementData.lines.map((line) => line.salesId);
	const resolvedTemplateId = payload.templateId || templateId;
	let buffer: Buffer;

	if (payload.includeSalesInvoicesInPdf) {
		const invoiceDocumentData = await getPrintDocumentData(db, {
			ids: selectedSalesIds,
			mode: "invoice",
		});
		buffer = await renderCustomerStatementWithSalesInvoicesPdfBuffer({
			data: statementData,
			templateId: resolvedTemplateId,
			baseUrl: pdfBaseUrl,
			logoUrl: statementData.logoUrl,
			watermarkText: "Customer Statement",
			title,
			invoicePages: invoiceDocumentData.pages,
			invoiceCompanyAddress: invoiceDocumentData.companyAddress,
			invoiceTemplateId: salesTemplateId,
			invoiceLogoUrl: invoiceDocumentData.logoUrl,
		});
	} else {
		buffer = await renderCustomerStatementPdfBuffer({
			data: statementData,
			templateId: resolvedTemplateId,
			baseUrl: pdfBaseUrl,
			logoUrl: statementData.logoUrl,
			watermarkText: "Customer Statement",
			title,
		});
	}

	return createPdfResponse({
		buffer,
		title,
		preview,
	});
}
