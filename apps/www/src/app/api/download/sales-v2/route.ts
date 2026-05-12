import {
	normalizeSalesPrintMode,
	parseSalesPrintRequest,
} from "@/modules/sales-print/application/sales-print-request";
import {
	getSalesSnapshotDocumentById,
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

type StoredPdfSnapshotLookup = {
	snapshot: {
		documentType: string;
	};
	storedDocument: {
		url: string | null;
		pathname: string;
		filename: string | null;
		mimeType: string | null;
	};
};

async function streamStoredPdfSnapshot(input: {
	snapshotLookup: StoredPdfSnapshotLookup;
	requestUrl: URL;
	preview: boolean;
}): Promise<Response | null> {
	const sourceUrl =
		input.snapshotLookup.storedDocument.url ||
		input.snapshotLookup.storedDocument.pathname;
	const absoluteSourceUrl = sourceUrl.startsWith("http")
		? sourceUrl
		: new URL(sourceUrl, input.requestUrl.origin).toString();
	const upstream = await fetch(absoluteSourceUrl);
	if (!upstream.ok) {
		return null;
	}

	const headers: Record<string, string> = {
		"Content-Type":
			input.snapshotLookup.storedDocument.mimeType || "application/pdf",
		"Cache-Control": "no-store, max-age=0",
	};
	const filename =
		input.snapshotLookup.storedDocument.filename ||
		`${input.snapshotLookup.snapshot.documentType}.pdf`;
	headers["Content-Disposition"] = input.preview
		? `inline; filename="${filename}"`
		: `attachment; filename="${filename}"`;

	return new Response(upstream.body, {
		headers,
		status: upstream.status,
	});
}

async function renderSnapshotPdfFallback(input: {
	requestUrl: URL;
	preview: boolean;
	templateId?: string | null;
	publicToken?: string | null;
	accessToken?: string | null;
	snapshotId?: string | null;
}) {
	const documentData = await resolveSalesDocumentPreviewData({
		db,
		publicToken: input.publicToken,
		accessToken: input.accessToken,
		snapshotId: input.snapshotId,
		templateId: input.templateId,
		baseUrl: input.requestUrl.origin,
	});
	if (!documentData) return null;

	const buffer = await renderSalesPdfBuffer({
		pages: documentData.pages,
		title: documentData.title,
		templateId: documentData.templateId,
		companyAddress: documentData.companyAddress,
		baseUrl: input.requestUrl.origin,
		previewUrl: documentData.previewUrl,
	});

	return createPdfResponse({
		buffer,
		title: documentData.title,
		preview: input.preview,
	});
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

	headers["Content-Disposition"] = input.preview
		? `inline; filename="${input.title}.pdf"`
		: `attachment; filename="${input.title}.pdf"`;

	const body = input.buffer.buffer.slice(
		input.buffer.byteOffset,
		input.buffer.byteOffset + input.buffer.byteLength,
	) as ArrayBuffer;

	return new Response(body, { headers });
}

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
		if (snapshotLookup) {
			const storedResponse = await streamStoredPdfSnapshot({
				snapshotLookup,
				requestUrl,
				preview: params.preview,
			});
			if (storedResponse) return storedResponse;
		}

		const fallbackResponse = await renderSnapshotPdfFallback({
			requestUrl,
			preview: params.preview,
			templateId: params.templateId,
			publicToken: params.pt,
		});
		if (fallbackResponse) return fallbackResponse;
		notFound();
	}

	if (printRequest.locatorType === "access-token") {
		const snapshotLookup = await getSalesSnapshotDocumentByAccessToken({
			db,
			accessToken: params.accessToken,
		});
		if (snapshotLookup) {
			const storedResponse = await streamStoredPdfSnapshot({
				snapshotLookup,
				requestUrl,
				preview: params.preview,
			});
			if (storedResponse) return storedResponse;
		}

		const fallbackResponse = await renderSnapshotPdfFallback({
			requestUrl,
			preview: params.preview,
			templateId: params.templateId,
			accessToken: params.accessToken,
		});
		if (fallbackResponse) return fallbackResponse;
		notFound();
	}

	if (printRequest.locatorType === "snapshot-id") {
		const snapshotLookup = await getSalesSnapshotDocumentById({
			db,
			snapshotId: params.snapshotId,
		});
		if (snapshotLookup) {
			const storedResponse = await streamStoredPdfSnapshot({
				snapshotLookup,
				requestUrl,
				preview: params.preview,
			});
			if (storedResponse) return storedResponse;
		}

		const fallbackResponse = await renderSnapshotPdfFallback({
			requestUrl,
			preview: params.preview,
			templateId: params.templateId,
			snapshotId: params.snapshotId,
		});
		if (fallbackResponse) return fallbackResponse;
		notFound();
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

	return createPdfResponse({
		buffer,
		title: documentData.title,
		preview: params.preview,
	});
}
