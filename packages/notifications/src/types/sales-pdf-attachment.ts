import type { Db } from "@gnd/db";
import { renderSalesPdfBuffer } from "@gnd/pdf/sales-v2";
import { getPrintDocumentData } from "@gnd/sales/print";
import type { PrintMode } from "@gnd/sales/print/types";
import { getAppUrl } from "@gnd/utils/envs";
import {
	type SalesPdfToken,
	tokenSchemas,
	validateToken,
} from "@gnd/utils/tokenizer";

const DEFAULT_TEMPLATE_ID = "template-2";

const LEGACY_TO_V2_MODE: Record<string, PrintMode> = {
	order: "invoice",
	"packing list": "packing-slip",
	quote: "quote",
	production: "production",
	"order-packing": "order-packing",
	invoice: "invoice",
	"packing-slip": "packing-slip",
};

export type SalesPdfAttachment = {
	filename: string;
	content: string;
	contentType: "application/pdf";
};

type BuildSalesPdfAttachmentInput = {
	salesIds: number[];
	mode: SalesPdfToken["mode"] | PrintMode;
	dispatchId?: number | null;
	templateId?: string;
};

function resolvePrintMode(mode: BuildSalesPdfAttachmentInput["mode"]) {
	return LEGACY_TO_V2_MODE[mode] ?? "invoice";
}

export async function buildSalesPdfAttachment(
	db: Db,
	input: BuildSalesPdfAttachmentInput,
): Promise<SalesPdfAttachment> {
	const documentData = await getPrintDocumentData(db, {
		ids: input.salesIds,
		mode: resolvePrintMode(input.mode),
		dispatchId: input.dispatchId ?? null,
	});
	const buffer = await renderSalesPdfBuffer({
		pages: documentData.pages,
		title: documentData.title,
		templateId: input.templateId ?? DEFAULT_TEMPLATE_ID,
		companyAddress: documentData.companyAddress,
		logoUrl: documentData.logoUrl ?? undefined,
		baseUrl: getAppUrl() || "http://localhost:3010",
		config: {
			showImages: false,
		},
	});

	return {
		filename: `${documentData.title}.pdf`,
		content: buffer.toString("base64"),
		contentType: "application/pdf",
	};
}

export async function buildSalesPdfAttachmentFromToken(
	db: Db,
	token: string,
): Promise<SalesPdfAttachment> {
	const payload = validateToken(token, tokenSchemas.salesPdfToken);
	if (!payload) {
		throw new Error("Invalid sales PDF token for email attachment");
	}

	return buildSalesPdfAttachment(db, {
		salesIds: payload.salesIds,
		mode: payload.mode,
		dispatchId: payload.dispatchId ?? null,
	});
}
