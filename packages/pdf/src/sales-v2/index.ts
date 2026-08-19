export { SalesPdfDocument } from "./document";
export { SalesHtmlDocument } from "./html-document";
export { SalesHtmlAddressBlocks } from "./shared/html-template";
export { SalesHtmlSections } from "./shared/html-template";
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
