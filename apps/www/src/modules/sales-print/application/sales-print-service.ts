import {
	resolveSalesDocumentAccessAction,
	resolveSalesDocumentHtmlPreviewAccessAction,
} from "@/actions/resolve-sales-document-access";
import {
	closeViewerShell,
	openViewerShell,
} from "@/components/viewer-shell/controller";
import { getBaseUrl } from "@/lib/base-url";
import { openLink } from "@/lib/open-link";
import type { IOrderPrintMode } from "@/types/sales";
import type { ResolveSalesDocumentAccessResult } from "@gnd/api/utils/sales-document-access";
import type { PrintMode } from "@gnd/sales/print/types";
import type { ReactNode } from "react";
import { createElement } from "react";
import { ATTACHMENT_OVERLAY } from "./feature-flags";
import {
	DEFAULT_SALES_PRINT_TEMPLATE_ID,
	normalizeSalesPrintMode,
} from "./sales-print-request";

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
	forceRegenerate?: boolean;
	openInNewTab?: boolean;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
}

type SalesPrintDependencies = {
	resolveAccess(input: {
		salesIds: number[];
		mode: PrintMode;
		dispatchId?: number | null;
		templateId?: string | null;
		baseUrl?: string | null;
		forceRegenerate?: boolean;
	}): Promise<ResolveSalesDocumentAccessResult>;
	resolveHtmlPreviewAccess(input: {
		salesIds: number[];
		mode: PrintMode;
		dispatchId?: number | null;
		templateId?: string | null;
		baseUrl?: string | null;
	}): Promise<ResolveSalesDocumentAccessResult>;
	openLink: typeof openLink;
	openViewerShell: typeof openViewerShell;
	closeViewerShell?: typeof closeViewerShell;
	openPendingPrintWindow: typeof openPendingPrintWindow;
	createPrintViewerContent: typeof createPrintViewerContent;
	mountHiddenPrintViewer?: typeof mountHiddenPrintViewer;
	createPrintLoadingContent?: typeof createPrintLoadingContent;
	getBaseUrl: typeof getBaseUrl;
	useAttachmentOverlay: boolean;
};

const defaultDependencies: SalesPrintDependencies = {
	resolveAccess: resolveSalesDocumentAccessAction,
	resolveHtmlPreviewAccess: resolveSalesDocumentHtmlPreviewAccessAction,
	openLink,
	openViewerShell,
	closeViewerShell,
	openPendingPrintWindow,
	createPrintViewerContent,
	mountHiddenPrintViewer,
	createPrintLoadingContent,
	getBaseUrl,
	useAttachmentOverlay: ATTACHMENT_OVERLAY,
};

const inflightAccessRequests = new Map<
	string,
	Promise<ResolveSalesDocumentAccessResult>
>();
const inflightHtmlPreviewRequests = new Map<
	string,
	Promise<ResolveSalesDocumentAccessResult>
>();

export function resolveSalesPrintMode(
	mode?: SalesPrintRequestMode,
	salesType: SalesType = "order",
): PrintMode {
	return normalizeSalesPrintMode(mode, salesType);
}

export function buildSalesPrintViewerUrl(
	access: Pick<ResolveSalesDocumentAccessResult, "accessToken" | "kind">,
	options?: {
		preview?: boolean;
		templateId?: string | null;
		mode?: PrintMode;
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
	mode?: PrintMode;
	origin?: string;
}) {
	const path = input.path || PRINT_VIEWER_PATH;
	const url = input.origin
		? new URL(path, input.origin)
		: new URL(path, "http://same-origin.local");

	if (input.pt) url.searchParams.set("pt", input.pt);
	if (input.token) url.searchParams.set("token", input.token);
	if (input.accessToken) url.searchParams.set("accessToken", input.accessToken);
	if (input.snapshotId) url.searchParams.set("snapshotId", input.snapshotId);
	if (typeof input.preview === "boolean") {
		url.searchParams.set("preview", String(input.preview));
	}
	if (input.mode) {
		url.searchParams.set("mode", input.mode);
	}

	const templateId = input.templateId ?? DEFAULT_SALES_PRINT_TEMPLATE_ID;
	if (templateId && templateId !== DEFAULT_SALES_PRINT_TEMPLATE_ID) {
		url.searchParams.set("templateId", templateId);
	}

	if (input.origin) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

export function buildSalesPdfDownloadUrlFromQuery(input: {
	pt?: string;
	token?: string;
	accessToken?: string;
	snapshotId?: string;
	templateId?: string | null;
	preview?: boolean;
	origin?: string;
}) {
	return buildSalesDocumentRouteFromQuery({
		...input,
		path: DOWNLOAD_ROUTE_PATH,
		preview: input.preview ?? false,
	});
}

export async function resolveSalesPrintAccess(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const mode = resolveSalesPrintMode(request.mode);
	const baseUrl = request.baseUrl ?? dependencies.getBaseUrl();
	const templateId = request.templateId ?? DEFAULT_SALES_PRINT_TEMPLATE_ID;
	const accessKey = JSON.stringify({
		salesIds: [...request.salesIds].sort((a, b) => a - b),
		mode,
		dispatchId: request.dispatchId ?? null,
		templateId,
		baseUrl,
		forceRegenerate: request.forceRegenerate ?? false,
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
			forceRegenerate: request.forceRegenerate ?? false,
		})
		.finally(() => {
			inflightAccessRequests.delete(accessKey);
		});

	inflightAccessRequests.set(accessKey, pendingAccess);
	return pendingAccess;
}

export async function resolveSalesHtmlPreviewAccess(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const mode = resolveSalesPrintMode(request.mode);
	const baseUrl = request.baseUrl ?? dependencies.getBaseUrl();
	const templateId = request.templateId ?? DEFAULT_SALES_PRINT_TEMPLATE_ID;
	const accessKey = JSON.stringify({
		salesIds: [...request.salesIds].sort((a, b) => a - b),
		mode,
		dispatchId: request.dispatchId ?? null,
		templateId,
		baseUrl,
	});

	const inflight = inflightHtmlPreviewRequests.get(accessKey);
	if (inflight) return inflight;

	const pendingAccess = dependencies
		.resolveHtmlPreviewAccess({
			salesIds: request.salesIds,
			mode,
			dispatchId: request.dispatchId ?? null,
			templateId,
			baseUrl,
		})
		.finally(() => {
			inflightHtmlPreviewRequests.delete(accessKey);
		});

	inflightHtmlPreviewRequests.set(accessKey, pendingAccess);
	return pendingAccess;
}

export async function openSalesPrintDocument(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const mode = resolveSalesPrintMode(request.mode);
	const shouldUseAttachmentOverlay =
		dependencies.useAttachmentOverlay && !request.openInNewTab;
	const pendingWindow = request.openInNewTab
		? dependencies.openPendingPrintWindow()
		: shouldUseAttachmentOverlay
			? null
			: dependencies.openPendingPrintWindow();

	try {
		const access = await resolveSalesPrintAccess(request, dependencies);
		const href = buildSalesPrintViewerUrl(access, {
			preview: false,
			templateId: request.templateId,
			mode,
		});

		if (shouldUseAttachmentOverlay) {
			const mountedHiddenViewer = await dependencies.mountHiddenPrintViewer?.(href, {
				onPrintReady: () => {
					request.onPrintReady?.();
				},
				onPrintError: (error) => {
					request.onPrintError?.(error);
				},
			});

			if (mountedHiddenViewer) {
				return;
			}
		}

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

export async function regenerateSalesPrintDocument(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	return resolveSalesPrintAccess(
		{
			...request,
			forceRegenerate: true,
		},
		dependencies,
	);
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

export async function prepareSalesHtmlPreview(
	request: SalesPrintRequest,
	dependencies: SalesPrintDependencies = defaultDependencies,
) {
	const access = await resolveSalesHtmlPreviewAccess(request, dependencies);
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
		mode?: PrintMode;
		origin?: string;
	},
) {
	const origin =
		options?.origin ||
		(typeof window !== "undefined" ? window.location.origin : undefined);
	const url = new URL(path, origin ?? "http://same-origin.local");

	if (access.kind === "legacy") {
		url.searchParams.set("token", access.accessToken);
	} else {
		url.searchParams.set("accessToken", access.accessToken);
	}

	if (typeof options?.preview === "boolean") {
		url.searchParams.set("preview", String(options.preview));
	}
	if (options?.mode) {
		url.searchParams.set("mode", options.mode);
	}

	const templateId = options?.templateId ?? DEFAULT_SALES_PRINT_TEMPLATE_ID;
	if (templateId && templateId !== DEFAULT_SALES_PRINT_TEMPLATE_ID) {
		url.searchParams.set("templateId", templateId);
	}

	if (origin) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
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

function getSalesPrintViewerTitle(mode: PrintMode) {
	if (mode === "quote") return "Print Quote";
	if (mode === "packing-slip") return "Print Packing Slip";
	if (mode === "production") return "Print Production";
	if (mode === "order-packing") return "Print Order + Packing";

	return "Print Invoice";
}

async function createPrintViewerContent(href: string): Promise<ReactNode> {
	const { SalesPrintShellViewer } = await import(
		"@/modules/sales-print/ui/sales-print-shell-viewer"
	);

	return createElement(SalesPrintShellViewer, { href });
}

async function mountHiddenPrintViewer(
	href: string,
	callbacks?: {
		onPrintReady?: () => void;
		onPrintError?: (error: unknown) => void;
	},
) {
	if (typeof document === "undefined") return false;

	const { createRoot } = await import("react-dom/client");
	const { SalesPrintShellViewer } = await import(
		"@/modules/sales-print/ui/sales-print-shell-viewer"
	);

	const host = document.createElement("div");
	host.setAttribute("data-sales-hidden-print-host", "true");
	Object.assign(host.style, {
		position: "fixed",
		top: "0",
		left: "-10000px",
		width: "1024px",
		height: "768px",
		overflow: "hidden",
		opacity: "0",
		pointerEvents: "none",
		zIndex: "-1",
	});

	document.body.appendChild(host);
	const root = createRoot(host);
	let cleanupTimer: number | null = null;

	const cleanup = () => {
		if (cleanupTimer) {
			window.clearTimeout(cleanupTimer);
			cleanupTimer = null;
		}
		root.unmount();
		host.remove();
	};

	root.render(
		createElement(SalesPrintShellViewer, {
			href,
			onPrintReady: () => {
				callbacks?.onPrintReady?.();
				cleanupTimer = window.setTimeout(cleanup, 60_000);
			},
			onPrintError: (error: unknown) => {
				callbacks?.onPrintError?.(error);
				cleanup();
			},
		}),
	);

	return true;
}

function createPrintLoadingContent(mode: PrintMode): ReactNode {
	return createElement(
		"div",
		{
			className:
				"flex h-full min-h-[420px] items-center justify-center bg-background text-foreground",
		},
		createElement(
			"div",
			{
				className:
					"flex w-[min(360px,calc(100vw-48px))] flex-col items-center gap-4 rounded-lg border bg-card px-6 py-8 text-center shadow-sm",
			},
			createElement("div", {
				className:
					"size-10 animate-spin rounded-full border-4 border-muted border-t-primary",
				"aria-hidden": true,
			}),
			createElement(
				"div",
				{ className: "space-y-1" },
				createElement(
					"p",
					{ className: "text-sm font-semibold" },
					"Generating document...",
				),
				createElement(
					"p",
					{ className: "text-xs text-muted-foreground" },
					`Preparing ${getSalesPrintViewerTitle(mode).toLowerCase()} for preview.`,
				),
			),
		),
	);
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
