/** @jsxImportSource react */
import type { CompanyAddress, PrintPage } from "@gnd/sales/print/types";
import { renderToBuffer } from "@react-pdf/renderer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { SalesPdfDocument } from "./document";
import { generateQrCodeDataUrl } from "./qr";
import type { SalesTemplateConfig } from "./registry";

export const SALES_PDF_RENDER_VERSION = 2026092602;

type RenderSalesPdfBufferInput = {
	pages: PrintPage[];
	companyAddress: CompanyAddress;
	templateId?: string;
	baseUrl?: string;
	watermark?: string | null;
	logoUrl?: string;
	previewUrl?: string;
	qrCodeDataUrl?: string;
	config?: Partial<SalesTemplateConfig>;
	title?: string;
};

export async function renderSalesPdfBuffer(input: RenderSalesPdfBufferInput) {
	const qrCodeDataUrl =
		input.qrCodeDataUrl ?? (await generateQrCodeDataUrl(input.previewUrl));
	const logoUrl = await resolvePdfLogoUrl(
		input.logoUrl || (await getDefaultPdfLogoUrl()),
	);
	const pages = await Promise.all(
		input.pages.map(async (page) =>
			page.branding?.logoUrl
				? {
						...page,
						branding: {
							...page.branding,
							logoUrl: await resolvePdfLogoUrl(page.branding.logoUrl),
						},
					}
				: page,
		),
	);
	return renderToBuffer(
		<SalesPdfDocument
			pages={pages}
			templateId={input.templateId}
			baseUrl={input.baseUrl}
			watermark={
				input.watermark === undefined && input.logoUrl ? null : input.watermark
			}
			logoUrl={logoUrl}
			previewUrl={input.previewUrl}
			qrCodeDataUrl={qrCodeDataUrl}
			companyAddress={input.companyAddress}
			config={input.config}
			title={input.title}
		/>,
	);
}

async function resolvePdfLogoUrl(logoUrl?: string) {
	if (!logoUrl?.startsWith("data:image/svg+xml")) return logoUrl;
	const comma = logoUrl.indexOf(",");
	if (comma < 0) throw new Error("Invalid dealer logo data URL");
	const header = logoUrl.slice(0, comma);
	const body = logoUrl.slice(comma + 1);
	const svg = header.includes(";base64")
		? Buffer.from(body, "base64")
		: Buffer.from(decodeURIComponent(body));
	const png = await sharp(svg).png().toBuffer();
	return `data:image/png;base64,${png.toString("base64")}`;
}

async function getDefaultPdfLogoUrl() {
	const cwd = process.cwd();
	for (const path of [
		join(cwd, "public", "logo.png"),
		join(cwd, "apps", "dashboard", "public", "logo.png"),
		join(cwd, "..", "dashboard", "public", "logo.png"),
	]) {
		try {
			const logo = await readFile(path);
			return `data:image/png;base64,${logo.toString("base64")}`;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
	}
	return undefined;
}
