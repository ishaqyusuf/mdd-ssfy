import type { SalesTemplateRenderProps } from "../../registry";
import { SalesHtmlTemplatePage } from "../../shared/html-template";

export function Template1Html(props: SalesTemplateRenderProps) {
	return (
		<SalesHtmlTemplatePage
			page={props.page}
			companyAddress={props.companyAddress}
			baseUrl={props.baseUrl}
			logoUrl={props.logoUrl}
			previewUrl={props.previewUrl}
			qrCodeDataUrl={props.qrCodeDataUrl}
			variant="template-1"
		/>
	);
}
