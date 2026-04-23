import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { SalesPdfDocument } from "./document";
import type { SalesTemplateConfig } from "./registry";

type RenderSalesPdfBufferInput = {
	pages: PrintPage[];
	companyAddress: CompanyAddress;
	templateId?: string;
	baseUrl?: string;
	watermark?: string;
	logoUrl?: string;
	previewUrl?: string;
	config?: Partial<SalesTemplateConfig>;
	title?: string;
};

export async function renderSalesPdfBuffer(input: RenderSalesPdfBufferInput) {
	const qrCodeDataUrl = input.previewUrl
		? await QRCode.toDataURL(input.previewUrl, {
				margin: 0,
				width: 144,
			})
		: undefined;
	return renderToBuffer(
		<SalesPdfDocument
			pages={input.pages}
			templateId={input.templateId}
			baseUrl={input.baseUrl}
			watermark={input.watermark}
			logoUrl={input.logoUrl}
			previewUrl={input.previewUrl}
			qrCodeDataUrl={qrCodeDataUrl}
			companyAddress={input.companyAddress}
			config={input.config}
			title={input.title}
		/>,
	);
}
