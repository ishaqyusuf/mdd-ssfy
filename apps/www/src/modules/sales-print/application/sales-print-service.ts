import { resolveSalesDocumentAccessAction } from "@/actions/resolve-sales-document-access";
import { getBaseUrl } from "@/lib/base-url";
import { openLink } from "@/lib/open-link";
import type { IOrderPrintMode } from "@/types/sales";
import type { ResolveSalesDocumentAccessResult } from "@gnd/api/utils/sales-document-access";
import type { PrintMode } from "@gnd/sales/print/types";

const DEFAULT_TEMPLATE_ID = "template-2";
const PRINT_VIEWER_PATH = "p/sales-invoice-v2";
const PREVIEW_PAGE_PATH = "p/sales-document-v2";
const DOWNLOAD_ROUTE_PATH = "api/download/sales-v2";

type SalesType = "order" | "quote";
export type SalesPrintRequestMode = PrintMode | IOrderPrintMode;

export interface SalesPrintRequest {
	salesIds: number[];
	mode?: SalesPrintRequestMode;
	dispatchId?: number | null;
	templateId?: string | null;
	baseUrl?: string | null;
}

type SalesPrintDependencies = {
	resolveAccess(input: {
		salesIds: number[];
		mode: PrintMode;
		dispatchId?: number | null;
		templateId?: string | null;
		baseUrl?: string | null;
	}): Promise<ResolveSalesDocumentAccessResult>;
	openLink: typeof openLink;
	getBaseUrl: typeof getBaseUrl;
};

const defaultDependencies: SalesPrintDependencies = {
	resolveAccess: resolveSalesDocumentAccessAction,
	openLink,
	getBaseUrl,
};

const inflightAccessRequests = new Map<
	string,
	Promise<ResolveSalesDocumentAccessResult>
>();

export function resolveSalesPrintMode(
	mode?: SalesPrintRequestMode,
	salesType: SalesType = "order",
): PrintMode {
	switch (mode) {
		case "invoice":
			return "invoice";
		case "quote":
			return "quote";
		case "production":
			return "production";
		case "packing list":
		case "packing-slip":
			return "packing-slip";
		case "order-packing":
			return "order-packing";
		case "order":
			return "invoice";
		default:
			return salesType === "quote" ? "quote" : "invoice";
	}
}

export function buildSalesPrintViewerUrl(
	access: Pick<ResolveSalesDocumentAccessResult, "accessToken" | "kind">,
	options?: {
		preview?: boolean;
		templateId?: string | null;
		origin?: string;
	},
) {
	return buildSalesDocumentRouteUrl(PRINT_VIEWER_PATH, access, options);
}

export function buildSalesDocumentPreviewUrl(
	access: Pick<ResolveSalesDocumentAccessResult, "accessToken" | "kind">,
	options?: {
		templateId?: string | null;
		origin?: string;
	},
) {
	return buildSalesDocumentRouteUrl(PREVIEW_PAGE_PATH, access, {
		templateId: options?.templateId,
		origin: options?.origin,
	});
}

export function buildSalesDocumentRouteFromQuery(input: {
	path?: string;
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
	preview?: boolean;
	templateId?: string | null;
	origin?: string;
}) {
	const origin =
		input.origin ||
		(typeof window !== "undefined" ? window.location.origin : "http://localhost");
	const url = new URL(input.path || PRINT_VIEWER_PATH, origin);

	if (input.pt) url.searchParams.set("pt", input.pt);
	if (input.token) url.searchParams.set("token", input.token);
	if (input.accessToken) url.searchParams.set("accessToken", input.accessToken);
	if (input.snapshotId) url.searchParams.set("snapshotId", input.snapshotId);
	if (typeof input.preview === "boolean") {
		url.searchParams.set("preview", String(input.preview));
	}

	const templateId = input.templateId ?? DEFAULT_TEMPLATE_ID;
	if (templateId && templateId !== DEFAULT_TEMPLATE_ID) {
		url.searchParams.set("templateId", templateId);
	}

	return url.toString();
}

export function buildSalesPdfDownloadUrlFromQuery(input: {
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
	templateId?: string | null;
	origin?: string;
}) {
	return buildSalesDocumentRouteFromQuery({
		...input,
		path: DOWNLOAD_ROUTE_PATH,
		preview: false,
	});
}

export async function resolveSalesPrintAccess(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const mode = resolveSalesPrintMode(request.mode);
	const baseUrl = request.baseUrl ?? dependencies.getBaseUrl();
	const templateId = request.templateId ?? DEFAULT_TEMPLATE_ID;
	const accessKey = JSON.stringify({
		salesIds: [...request.salesIds].sort((a, b) => a - b),
		mode,
		dispatchId: request.dispatchId ?? null,
		templateId,
		baseUrl,
	});

	const inflight = inflightAccessRequests.get(accessKey);
	if (inflight) return inflight;

	const pendingAccess = dependencies
		.resolveAccess({
			salesIds: request.salesIds,
			mode,
			dispatchId: request.dispatchId ?? null,
			templateId,
			baseUrl,
		})
		.finally(() => {
			inflightAccessRequests.delete(accessKey);
		});

	inflightAccessRequests.set(accessKey, pendingAccess);
	return pendingAccess;
}

export async function openSalesPrintDocument(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const pendingWindow = openPendingPrintWindow();

	try {
		const access = await resolveSalesPrintAccess(request, dependencies);
		const href = buildSalesPrintViewerUrl(access, {
			preview: false,
			templateId: request.templateId,
		});

		if (pendingWindow && !pendingWindow.closed) {
			pendingWindow.location.replace(href);
			return;
		}

		dependencies.openLink(href, null, true);
	} catch (error) {
		if (pendingWindow && !pendingWindow.closed) {
			pendingWindow.close();
		}
		throw error;
	}
}

export async function downloadSalesPrintDocument(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const access = await resolveSalesPrintAccess(request, dependencies);
	downloadSilently(access.downloadUrl);
}

export async function prepareSalesPrintPreview(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const access = await resolveSalesPrintAccess(request, dependencies);
	return buildSalesDocumentPreviewUrl(access, {
		templateId: request.templateId,
	});
}

export function printOrder(request: Omit<SalesPrintRequest, "mode">) {
	return openSalesPrintDocument({ ...request, mode: "invoice" });
}

export function printOrderWithPacking(
	request: Omit<SalesPrintRequest, "mode">,
) {
	return openSalesPrintDocument({ ...request, mode: "order-packing" });
}

export function printPackingSlip(request: Omit<SalesPrintRequest, "mode">) {
	return openSalesPrintDocument({ ...request, mode: "packing-slip" });
}

export function printProduction(request: Omit<SalesPrintRequest, "mode">) {
	return openSalesPrintDocument({ ...request, mode: "production" });
}

export function printQuote(request: Omit<SalesPrintRequest, "mode">) {
	return openSalesPrintDocument({ ...request, mode: "quote" });
}

function buildSalesDocumentRouteUrl(
	path: string,
	access: Pick<ResolveSalesDocumentAccessResult, "accessToken" | "kind">,
	options?: {
		preview?: boolean;
		templateId?: string | null;
		origin?: string;
	},
) {
	const origin =
		options?.origin ||
		(typeof window !== "undefined" ? window.location.origin : "http://localhost");
	const url = new URL(path, origin);

	if (access.kind === "legacy") {
		url.searchParams.set("token", access.accessToken);
	} else {
		url.searchParams.set("accessToken", access.accessToken);
	}

	if (typeof options?.preview === "boolean") {
		url.searchParams.set("preview", String(options.preview));
	}

	const templateId = options?.templateId ?? DEFAULT_TEMPLATE_ID;
	if (templateId && templateId !== DEFAULT_TEMPLATE_ID) {
		url.searchParams.set("templateId", templateId);
	}

	return url.toString();
}

function downloadSilently(url: string) {
	const link = document.createElement("a");
	link.href = url;
	link.rel = "noopener";
	link.style.display = "none";
	document.body.appendChild(link);
	link.click();

	setTimeout(() => {
		link.remove();
	}, 1_000);
}

function openPendingPrintWindow() {
	if (typeof window === "undefined") return null;

	const printWindow = window.open("", "_blank");
	if (!printWindow) return null;

	printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Preparing print…</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8fafc;
        color: #0f172a;
        font: 14px/1.5 ui-sans-serif, system-ui, sans-serif;
      }
      .card {
        display: grid;
        gap: 12px;
        width: min(420px, calc(100vw - 32px));
        padding: 24px;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
      }
      .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #cbd5e1;
        border-top-color: #0f172a;
        border-radius: 9999px;
        animation: spin 0.8s linear infinite;
      }
      p { margin: 0; }
      .muted { color: #475569; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner" aria-hidden="true"></div>
      <p><strong>Preparing your print view…</strong></p>
      <p class="muted">This tab will update automatically as soon as the document is ready.</p>
    </div>
  </body>
</html>`);
	printWindow.document.close();

	return printWindow;
}
