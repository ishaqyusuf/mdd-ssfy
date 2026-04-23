import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { type SalesTemplateConfig, getTemplate } from "./registry";

interface SalesHtmlDocumentProps {
	pages: PrintPage[];
	templateId?: string;
	baseUrl?: string;
	watermark?: string;
	logoUrl?: string;
	previewUrl?: string;
	companyAddress: CompanyAddress;
	config?: Partial<SalesTemplateConfig>;
}

export function SalesHtmlDocument({
	pages,
	templateId = "template-1",
	baseUrl,
	watermark,
	logoUrl,
	previewUrl,
	companyAddress,
	config,
}: SalesHtmlDocumentProps) {
	const template = getTemplate(templateId);
	const HtmlTemplate = template.html;
	const resolvedConfig: SalesTemplateConfig = {
		showImages: true,
		...config,
	};

	return (
		<div className="sales-html-document" style={{ display: "grid", gap: 24 }}>
			{pages.map((page, index) => (
				<HtmlTemplate
					key={`${page.meta.salesNo}-${page.meta.date}-${page.meta.title}-${page.meta.po || index}`}
					page={page}
					baseUrl={baseUrl}
					watermark={watermark}
					logoUrl={logoUrl}
					previewUrl={index === 0 ? previewUrl : undefined}
					pageIndex={index}
					companyAddress={companyAddress}
					config={resolvedConfig}
				/>
			))}
		</div>
	);
}
