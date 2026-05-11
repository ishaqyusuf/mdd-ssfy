import {
	normalizeSalesPrintMode,
	parseSalesPrintRequest,
} from "@/modules/sales-print/application/sales-print-request";
import {
	getSalesSnapshotDocumentByAccessToken,
	getSalesSnapshotDocumentByPublicToken,
	resolveSalesDocumentPreviewData,
} from "@gnd/api/utils/sales-document-access";
import { db } from "@gnd/db";
import { renderSalesPdfBuffer } from "@gnd/pdf/sales-v2";
import { getPrintDocumentData } from "@gnd/sales/print";
import type { PrintMode } from "@gnd/sales/print/types";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const requestUrl = new URL(req.url);
	const printRequest = parseSalesPrintRequest(
		Object.fromEntries(requestUrl.searchParams.entries()),
	);
	const { params } = printRequest;

	if (!printRequest.isValid) {
		return NextResponse.json(
			{
				error:
					printRequest.invalidReason === "multiple-locators"
						? "Provide only one document locator"
						: "Missing document locator",
			},
			{ status: 400 },
		);
	}

	if (printRequest.locatorType === "public-token") {
		const snapshotLookup = await getSalesSnapshotDocumentByPublicToken({
			db,
			publicToken: params.pt,
		});
		if (!snapshotLookup) notFound();

		const previewData = await resolveSalesDocumentPreviewData({
			db,
			publicToken: params.pt,
			templateId: params.templateId,
			baseUrl: requestUrl.origin,
		});
		if (!previewData) notFound();

		const buffer = await renderSalesPdfBuffer({
			pages: previewData.pages,
			title: previewData.title,
			templateId: previewData.templateId,
			companyAddress: previewData.companyAddress,
			baseUrl: requestUrl.origin,
			previewUrl: previewData.previewUrl,
			qrCodeDataUrl: previewData.qrCodeDataUrl,
		});

		const headers: Record<string, string> = {
			"Content-Type":
				snapshotLookup.storedDocument.mimeType || "application/pdf",
			"Cache-Control": "no-store, max-age=0",
		};

		if (!params.preview) {
			headers["Content-Disposition"] =
				`attachment; filename="${previewData.title}.pdf"`;
		} else {
			headers["Content-Disposition"] =
				`inline; filename="${previewData.title}.pdf"`;
		}

		return new Response(buffer, { headers });
	}

	if (printRequest.locatorType === "access-token") {
		const snapshotLookup = await getSalesSnapshotDocumentByAccessToken({
			db,
			accessToken: params.accessToken,
		});
		if (!snapshotLookup) notFound();

		const sourceUrl =
			snapshotLookup.storedDocument.url ||
			snapshotLookup.storedDocument.pathname;
		const absoluteSourceUrl = sourceUrl.startsWith("http")
			? sourceUrl
			: new URL(sourceUrl, requestUrl.origin).toString();
		const upstream = await fetch(absoluteSourceUrl);
		if (!upstream.ok) {
			return NextResponse.json(
				{ error: "Unable to load stored PDF snapshot" },
				{ status: 502 },
			);
		}

		const headers: Record<string, string> = {
			"Content-Type":
				snapshotLookup.storedDocument.mimeType || "application/pdf",
			"Cache-Control": "no-store, max-age=0",
		};
		const filename =
			snapshotLookup.storedDocument.filename ||
			`${snapshotLookup.snapshot.documentType}.pdf`;
		headers["Content-Disposition"] = params.preview
			? `inline; filename="${filename}"`
			: `attachment; filename="${filename}"`;

		return new Response(upstream.body, {
			headers,
			status: upstream.status,
		});
	}

	if (printRequest.locatorType === "snapshot-id") {
		const previewData = await resolveSalesDocumentPreviewData({
			db,
			snapshotId: params.snapshotId,
			templateId: params.templateId,
			baseUrl: requestUrl.origin,
		});
		if (!previewData) notFound();

		const buffer = await renderSalesPdfBuffer({
			pages: previewData.pages,
			title: previewData.title,
			templateId: previewData.templateId,
			companyAddress: previewData.companyAddress,
			baseUrl: requestUrl.origin,
			previewUrl: previewData.previewUrl,
			qrCodeDataUrl: previewData.qrCodeDataUrl,
		});

		const headers: Record<string, string> = {
			"Content-Type": "application/pdf",
			"Cache-Control": "no-store, max-age=0",
		};

		if (!params.preview) {
			headers["Content-Disposition"] =
				`attachment; filename="${previewData.title}.pdf"`;
		} else {
			headers["Content-Disposition"] =
				`inline; filename="${previewData.title}.pdf"`;
		}

		return new Response(buffer, { headers });
	}

	const payload = params.token
		? validateToken(params.token, tokenSchemas.salesPdfToken)
		: null;

	if (!payload) notFound();

	const mode: PrintMode = normalizeSalesPrintMode(payload.mode);
	const documentData = await getPrintDocumentData(db, {
		ids: payload.salesIds,
		mode,
		dispatchId: payload.dispatchId ?? null,
	});

	const buffer = await renderSalesPdfBuffer({
		pages: documentData.pages,
		title: documentData.title,
		templateId: params.templateId,
		companyAddress: documentData.companyAddress,
		baseUrl: requestUrl.origin,
	});

	const headers: Record<string, string> = {
		"Content-Type": "application/pdf",
		"Cache-Control": "no-store, max-age=0",
	};

	if (!params.preview) {
		headers["Content-Disposition"] =
			`attachment; filename="${documentData.title}.pdf"`;
	} else {
		headers["Content-Disposition"] =
			`inline; filename="${documentData.title}.pdf"`;
	}

	return new Response(buffer, { headers });
}
