export { SalesPdfDocument } from "./document";
export { SalesHtmlDocument } from "./html-document";
export { generateQrCodeDataUrl } from "./qr";
export {
	DEFAULT_SALES_PAGE_BREAK_MODE,
	HEADLINE_FIRST_PAGE,
	normalizeSalesPageBreakMode,
} from "./registry";
export { renderSalesPdfBuffer } from "./render";
export type {
	SalesPageBreakMode,
	SalesPdfTemplateRenderer,
	SalesHtmlTemplateRenderer,
	SalesTemplateConfig,
} from "./registry";
