import { renderToBuffer } from "@react-pdf/renderer";
import { generateQrCodeDataUrl } from "../sales-v2/qr";
import { CustomerStatementPdfDocument } from "./document";
import type { CustomerStatementTemplateConfig } from "./registry";
import type { CustomerStatementPdfData } from "./types";

type RenderCustomerStatementPdfBufferInput = {
	data: CustomerStatementPdfData;
	templateId?: string;
	baseUrl?: string;
	logoUrl?: string | null;
	watermark?: string | null;
	watermarkText?: string | null;
	qrCodeDataUrl?: string | null;
	config?: Partial<CustomerStatementTemplateConfig>;
	title?: string;
};

export async function renderCustomerStatementPdfBuffer(
	input: RenderCustomerStatementPdfBufferInput,
) {
	const qrCodeDataUrl =
		input.qrCodeDataUrl ?? (await generateQrCodeDataUrl(input.data.paymentLink));

	return renderToBuffer(
		<CustomerStatementPdfDocument
			data={input.data}
			templateId={input.templateId}
			baseUrl={input.baseUrl}
			logoUrl={input.logoUrl}
			watermark={input.watermark}
			watermarkText={input.watermarkText}
			qrCodeDataUrl={qrCodeDataUrl}
			config={input.config}
			title={input.title}
		/>,
	);
}
