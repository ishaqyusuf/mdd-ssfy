/** @jsxImportSource react */
import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { Document, renderToBuffer } from "@react-pdf/renderer";
import { generateQrCodeDataUrl } from "../sales-v2/qr";
import {
	HEADLINE_FIRST_PAGE,
	type SalesTemplateConfig,
	getTemplate as getSalesTemplate,
} from "../sales-v2/registry";
import { CustomerStatementPdfDocument } from "./document";
import type { CustomerStatementTemplateConfig } from "./registry";
import { getTemplate as getCustomerStatementTemplate } from "./registry";
import type { CustomerStatementPdfData } from "./types";
import "../sales-v2/document";

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

type RenderCustomerStatementWithSalesInvoicesPdfBufferInput =
	RenderCustomerStatementPdfBufferInput & {
		invoicePages: PrintPage[];
		invoiceCompanyAddress: CompanyAddress;
		invoiceTemplateId?: string;
		invoiceLogoUrl?: string | null;
		invoiceWatermark?: string;
		invoiceConfig?: Partial<SalesTemplateConfig>;
	};

export async function renderCustomerStatementWithSalesInvoicesPdfBuffer(
	input: RenderCustomerStatementWithSalesInvoicesPdfBufferInput,
) {
	const qrCodeDataUrl =
		input.qrCodeDataUrl ?? (await generateQrCodeDataUrl(input.data.paymentLink));
	const statementTemplate = getCustomerStatementTemplate(
		input.templateId || "template-1",
	);
	const salesTemplate = getSalesTemplate(input.invoiceTemplateId || "template-1");
	const statementConfig: CustomerStatementTemplateConfig = {
		showPaymentLink: true,
		showWatermark: true,
		...input.config,
	};
	const invoiceConfig: SalesTemplateConfig = {
		showImages: true,
		headlineFirstPage: HEADLINE_FIRST_PAGE,
		...input.invoiceConfig,
	};
	const title = input.title || input.data.title || "Customer Statement";

	return renderToBuffer(
		<Document title={title}>
			<statementTemplate.pdf
				data={input.data}
				baseUrl={input.baseUrl}
				logoUrl={input.logoUrl ?? input.data.logoUrl}
				watermark={input.watermark}
				watermarkText={input.watermarkText}
				qrCodeDataUrl={qrCodeDataUrl}
				config={statementConfig}
			/>
			{input.invoicePages.map((page, i) => (
				<salesTemplate.pdf
					key={`${page.meta.salesNo}-${page.meta.date}-${page.meta.title}-${page.meta.po || i}`}
					page={page}
					baseUrl={input.baseUrl}
					watermark={input.invoiceWatermark}
					logoUrl={input.invoiceLogoUrl ?? undefined}
					pageIndex={i}
					companyAddress={input.invoiceCompanyAddress}
					config={invoiceConfig}
				/>
			))}
		</Document>,
	);
}
