import { Document, Font } from "@react-pdf/renderer";
import {
	type CustomerStatementTemplateConfig,
	getTemplate,
} from "./registry";
import type { CustomerStatementPdfData } from "./types";

Font.register({
	family: "Inter",
	fonts: [
		{
			src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
			fontWeight: 400,
		},
		{
			src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf",
			fontWeight: 500,
		},
		{
			src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf",
			fontWeight: 600,
		},
		{
			src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
			fontWeight: 700,
		},
	],
});

interface CustomerStatementPdfDocumentProps {
	data: CustomerStatementPdfData;
	templateId?: string;
	baseUrl?: string;
	logoUrl?: string | null;
	watermark?: string | null;
	watermarkText?: string | null;
	qrCodeDataUrl?: string | null;
	config?: Partial<CustomerStatementTemplateConfig>;
	title?: string;
	onRender?: Document["props"]["onRender"];
}

export function CustomerStatementPdfDocument({
	data,
	templateId = "template-1",
	baseUrl,
	logoUrl,
	watermark,
	watermarkText,
	qrCodeDataUrl,
	config,
	title,
	onRender,
}: CustomerStatementPdfDocumentProps) {
	const template = getTemplate(templateId);
	const resolvedConfig: CustomerStatementTemplateConfig = {
		showPaymentLink: true,
		showWatermark: true,
		...config,
	};

	return (
		<Document title={title || data.title || "Customer Statement"} onRender={onRender}>
			<template.pdf
				data={data}
				baseUrl={baseUrl}
				logoUrl={logoUrl ?? data.logoUrl}
				watermark={watermark}
				watermarkText={watermarkText}
				qrCodeDataUrl={qrCodeDataUrl}
				config={resolvedConfig}
			/>
		</Document>
	);
}
