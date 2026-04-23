import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import type { JSX } from "react";

export interface SalesTemplateConfig {
	showImages: boolean;
}

export interface SalesTemplateRenderProps {
	page: PrintPage;
	baseUrl?: string;
	watermark?: string;
	logoUrl?: string;
	previewUrl?: string;
	qrCodeDataUrl?: string;
	pageIndex?: number;
	companyAddress: CompanyAddress;
	config: SalesTemplateConfig;
}

export type SalesPdfTemplateRenderer = (
	props: SalesTemplateRenderProps,
) => JSX.Element;

export type SalesHtmlTemplateRenderer = (
	props: SalesTemplateRenderProps,
) => JSX.Element;

export type SalesTemplateRegistryEntry = {
	html: SalesHtmlTemplateRenderer;
	pdf: SalesPdfTemplateRenderer;
};

// ─── Registry ──────────────────────────────────────────────

import { Template1 } from "./templates/template-1";
import { Template1Html } from "./templates/template-1/html";
import { Template2 } from "./templates/template-2";
import { Template2Html } from "./templates/template-2/html";

const templates: Record<string, SalesTemplateRegistryEntry> = {
	"template-1": {
		html: Template1Html,
		pdf: Template1,
	},
	"template-2": {
		html: Template2Html,
		pdf: Template2,
	},
};

export function getTemplate(id: string): SalesTemplateRegistryEntry {
	return templates[id] ?? templates["template-1"];
}
