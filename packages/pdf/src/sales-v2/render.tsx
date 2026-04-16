import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { renderToBuffer } from "@react-pdf/renderer";
import { SalesPdfDocument } from "./document";
import type { SalesTemplateConfig } from "./registry";

type RenderSalesPdfBufferInput = {
	pages: PrintPage[];
	companyAddress: CompanyAddress;
	templateId?: string;
	baseUrl?: string;
	watermark?: string;
	logoUrl?: string;
	config?: Partial<SalesTemplateConfig>;
	title?: string;
};

export async function renderSalesPdfBuffer(input: RenderSalesPdfBufferInput) {
	return renderToBuffer(
		<SalesPdfDocument
			pages={input.pages}
			templateId={input.templateId}
			baseUrl={input.baseUrl}
			watermark={input.watermark}
			logoUrl={input.logoUrl}
			companyAddress={input.companyAddress}
			config={input.config}
			title={input.title}
		/>,
	);
}
