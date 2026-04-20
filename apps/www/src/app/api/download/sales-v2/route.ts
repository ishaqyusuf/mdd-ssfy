import { getSalesSnapshotDocumentByAccessToken } from "@gnd/api/utils/sales-document-access";
import { db } from "@gnd/db";
import { renderSalesPdfBuffer } from "@gnd/pdf/sales-v2";
import { getPrintDocumentData } from "@gnd/sales/print";
import type { PrintMode } from "@gnd/sales/print/types";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	token: z.string().optional(),
	accessToken: z.string().optional(),
	preview: z.preprocess((val) => val === "true", z.boolean().default(false)),
	templateId: z.string().optional().default("template-2"),
});

const LEGACY_TO_V2_MODE: Record<string, PrintMode> = {
	order: "invoice",
	"packing list": "packing-slip",
	quote: "quote",
	production: "production",
	"order-packing": "order-packing",
	invoice: "invoice",
	"packing-slip": "packing-slip",
};

export async function GET(req: NextRequest) {
	const requestUrl = new URL(req.url);
	const result = paramsSchema.safeParse(
		Object.fromEntries(requestUrl.searchParams.entries()),
	);

	if (!result.success) {
		return NextResponse.json(
			{ error: "Invalid download parameters" },
			{ status: 400 },
		);
	}

	if (result.data.accessToken) {
		const snapshotLookup = await getSalesSnapshotDocumentByAccessToken({
			db,
			accessToken: result.data.accessToken,
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
		headers["Content-Disposition"] = result.data.preview
			? `inline; filename="${filename}"`
			: `attachment; filename="${filename}"`;

		return new Response(upstream.body, {
			headers,
			status: upstream.status,
		});
	}

	const payload = result.data.token
		? validateToken(result.data.token, tokenSchemas.salesPdfToken)
		: null;

	if (!payload) notFound();

	const mode: PrintMode = LEGACY_TO_V2_MODE[payload.mode] ?? "invoice";
	const documentData = await getPrintDocumentData(db, {
		ids: payload.salesIds,
		mode,
		dispatchId: payload.dispatchId ?? null,
	});

	const buffer = await renderSalesPdfBuffer({
		pages: documentData.pages,
		title: documentData.title,
		templateId: result.data.templateId,
		companyAddress: documentData.companyAddress,
		baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
	});

	const headers: Record<string, string> = {
		"Content-Type": "application/pdf",
		"Cache-Control": "no-store, max-age=0",
	};

	if (!result.data.preview) {
		headers["Content-Disposition"] =
			`attachment; filename="${documentData.title}.pdf"`;
	} else {
		headers["Content-Disposition"] =
			`inline; filename="${documentData.title}.pdf"`;
	}

	return new Response(buffer, { headers });
}
