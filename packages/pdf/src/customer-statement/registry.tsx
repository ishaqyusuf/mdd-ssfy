import type { JSX } from "react";
import type { CustomerStatementPdfData } from "./types";
import { Template1 } from "./templates/template-1";

export interface CustomerStatementTemplateConfig {
	showPaymentLink: boolean;
	showWatermark: boolean;
}

export interface CustomerStatementTemplateRenderProps {
	data: CustomerStatementPdfData;
	baseUrl?: string;
	logoUrl?: string | null;
	watermark?: string | null;
	watermarkText?: string | null;
	qrCodeDataUrl?: string | null;
	config: CustomerStatementTemplateConfig;
}

export type CustomerStatementPdfTemplateRenderer = (
	props: CustomerStatementTemplateRenderProps,
) => JSX.Element;

export type CustomerStatementTemplateRegistryEntry = {
	pdf: CustomerStatementPdfTemplateRenderer;
};

const templates: Record<string, CustomerStatementTemplateRegistryEntry> = {
	"template-1": {
		pdf: Template1,
	},
};

export function getTemplate(id: string): CustomerStatementTemplateRegistryEntry {
	return templates[id] ?? templates["template-1"];
}
