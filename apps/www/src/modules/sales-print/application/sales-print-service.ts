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
export type SalesPrintRequestMode = PrintMode | IOrderPrintMode | string;

export interface SalesPrintRequest {
    salesIds: number[];
    mode?: SalesPrintRequestMode;
    pricingMode?: "customer" | "internal" | null;
    dispatchId?: number | null;
    templateId?: string | null;
    baseUrl?: string | null;
    forceRegenerate?: boolean;
    openInNewTab?: boolean;
    onPrintReady?: () => void;
    onPrintError?: (error: unknown) => void;
    onPrintStage?: (
        stage: SalesPrintStage,
        details?: SalesPrintStageDetails,
    ) => void;
}

type SalesPrintDependencies = {
    resolveAccess(input: {
        salesIds: number[];
        mode: PrintMode;
        pricingMode?: "customer" | "internal" | null;
        dispatchId?: number | null;
        templateId?: string | null;
        baseUrl?: string | null;
        forceRegenerate?: boolean;
    }): Promise<ResolveSalesDocumentAccessResult>;
    resolveHtmlPreviewAccess(input: {
        salesIds: number[];
        mode: PrintMode;
        pricingMode?: "customer" | "internal" | null;
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

export type SalesPrintStage =
    | "resolve-access-start"
    | "resolve-access-done"
    | "resolve-access-error"
    | "hidden-viewer-mounted"
    | "print-data-query-start"
    | "print-data-query-done"
    | "print-data-query-error"
    | "pdf-iframe-load"
    | "print-dialog-called"
    | "print-timeout";

export type SalesPrintStageDetails = {
    href?: string;
    mode?: PrintMode;
    salesIds?: number[];
    message?: string;
    error?: unknown;
    printedFromSnapshot?: boolean;
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

function buildSalesPrintViewerUrl(
    access: Pick<ResolveSalesDocumentAccessResult, "accessToken" | "kind">,
    options?: {
        preview?: boolean;
        templateId?: string | null;
        mode?: string;
        pricingMode?: "customer" | "internal" | null;
        origin?: string;
    },
) {
    return buildSalesDocumentRouteUrl(PRINT_VIEWER_PATH, access, options);
}

function buildSalesDocumentPreviewUrl(
    access: Pick<ResolveSalesDocumentAccessResult, "accessToken" | "kind">,
    options?: {
        templateId?: string | null;
        pricingMode?: "customer" | "internal" | null;
        origin?: string;
    },
) {
    return buildSalesDocumentRouteUrl(PREVIEW_PAGE_PATH, access, {
        templateId: options?.templateId,
        pricingMode: options?.pricingMode ?? null,
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
    mode?: string;
    pricingMode?: "customer" | "internal" | null;
    origin?: string;
}) {
    const path = input.path || PRINT_VIEWER_PATH;
    const url = input.origin
        ? new URL(path, input.origin)
        : new URL(path, "http://same-origin.local");

    if (input.pt) url.searchParams.set("pt", input.pt);
    if (input.token) url.searchParams.set("token", input.token);
    if (input.accessToken)
        url.searchParams.set("accessToken", input.accessToken);
    if (input.snapshotId) url.searchParams.set("snapshotId", input.snapshotId);
    if (typeof input.preview === "boolean") {
        url.searchParams.set("preview", String(input.preview));
    }
    if (input.mode) {
        url.searchParams.set("mode", input.mode);
    }
    if (input.pricingMode) {
        url.searchParams.set("pricingMode", input.pricingMode);
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
    fresh?: boolean;
    origin?: string;
}) {
    const href = buildSalesDocumentRouteFromQuery({
        ...input,
        path: DOWNLOAD_ROUTE_PATH,
        preview: input.preview ?? false,
    });

    if (!input.fresh) return href;

    const url = input.origin
        ? new URL(href)
        : new URL(href, "http://same-origin.local");
    url.searchParams.set("fresh", "true");

    if (input.origin) {
        return url.toString();
    }

    return `${url.pathname}${url.search}`;
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
        pricingMode: request.pricingMode ?? null,
    });

    const inflight = inflightAccessRequests.get(accessKey);
    if (inflight) return inflight;

    const pendingAccess = dependencies
        .resolveAccess({
            salesIds: request.salesIds,
            mode,
            pricingMode: request.pricingMode ?? null,
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
        pricingMode: request.pricingMode ?? null,
    });

    const inflight = inflightHtmlPreviewRequests.get(accessKey);
    if (inflight) return inflight;

    const pendingAccess = dependencies
        .resolveHtmlPreviewAccess({
            salesIds: request.salesIds,
            mode,
            pricingMode: request.pricingMode ?? null,
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
        ? null
        : shouldUseAttachmentOverlay
          ? null
          : dependencies.openPendingPrintWindow();

    try {
        request.onPrintStage?.("resolve-access-start", {
            mode,
            salesIds: request.salesIds,
        });
        const access = await resolveSalesPrintAccess(request, dependencies);
        const printedFromSnapshot =
            access.kind === "snapshot" && !access.generated;
        request.onPrintStage?.("resolve-access-done", {
            mode,
            salesIds: request.salesIds,
            printedFromSnapshot,
        });
        const href = buildSalesPrintViewerUrl(access, {
            preview: false,
            templateId: request.templateId,
            mode,
            pricingMode: request.pricingMode ?? null,
        });

        if (shouldUseAttachmentOverlay) {
            const mountedHiddenViewer =
                await dependencies.mountHiddenPrintViewer?.(href, {
                    onPrintReady: () => {
                        request.onPrintReady?.();
                    },
                    onPrintError: (error) => {
                        request.onPrintError?.(error);
                    },
                    onPrintStage: (stage, details) => {
                        request.onPrintStage?.(stage, {
                            ...details,
                            href: details?.href ?? href,
                            mode: details?.mode ?? mode,
                            salesIds: details?.salesIds ?? request.salesIds,
                            printedFromSnapshot:
                                details?.printedFromSnapshot ??
                                printedFromSnapshot,
                        });
                    },
                });

            if (mountedHiddenViewer) {
                request.onPrintStage?.("hidden-viewer-mounted", {
                    href,
                    mode,
                    salesIds: request.salesIds,
                    printedFromSnapshot,
                });
                return;
            }
        }

        if (pendingWindow && !pendingWindow.closed) {
            pendingWindow.location.replace(href);
            return;
        }

        dependencies.openLink(href, null, true);
    } catch (error) {
        request.onPrintStage?.("resolve-access-error", {
            mode,
            salesIds: request.salesIds,
            error,
        });
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
    const href = buildSalesDocumentRouteUrl(DOWNLOAD_ROUTE_PATH, access, {
        preview: false,
        templateId: request.templateId,
        pricingMode: request.pricingMode ?? null,
    });
    await downloadSilently(href);
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

export async function prepareSalesHtmlPreview(
    request: SalesPrintRequest,
    dependencies: SalesPrintDependencies = defaultDependencies,
) {
    const access = await resolveSalesHtmlPreviewAccess(request, dependencies);
    return buildSalesDocumentPreviewUrl(access, {
        templateId: request.templateId,
        pricingMode: request.pricingMode ?? null,
    });
}

export function printPackingSlip(request: Omit<SalesPrintRequest, "mode">) {
    return openSalesPrintDocument({ ...request, mode: "packing-slip" });
}

export function printProduction(request: Omit<SalesPrintRequest, "mode">) {
    return openSalesPrintDocument({ ...request, mode: "production" });
}

function buildSalesDocumentRouteUrl(
    path: string,
    access: Pick<ResolveSalesDocumentAccessResult, "accessToken" | "kind">,
    options?: {
        preview?: boolean;
        templateId?: string | null;
        mode?: string;
        pricingMode?: "customer" | "internal" | null;
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
    if (options?.pricingMode) {
        url.searchParams.set("pricingMode", options.pricingMode);
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

async function downloadSilently(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Unable to download PDF (${response.status}).`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download =
        getDownloadFilename(response.headers.get("Content-Disposition")) ||
        "sales-document.pdf";
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        link.remove();
        URL.revokeObjectURL?.(objectUrl);
    }, 1_000);
}

function getDownloadFilename(contentDisposition?: string | null) {
    if (!contentDisposition) return null;

    const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
        try {
            return decodeURIComponent(encodedMatch[1]);
        } catch {
            return encodedMatch[1];
        }
    }

    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    return filenameMatch?.[1] || null;
}

function getSalesPrintViewerTitle(mode: PrintMode) {
    if (mode === "quote") return "Print Quote";
    if (mode === "packing-slip") return "Print Packing Slip";
    if (mode === "production") return "Print Production";
    if (mode === "order-packing") return "Print Order + Packing";

    return "Print Invoice";
}

async function createPrintViewerContent(href: string): Promise<ReactNode> {
    const { SalesPrintShellViewer } =
        await import("@/modules/sales-print/ui/sales-print-shell-viewer");

    return createElement(SalesPrintShellViewer, { href });
}

async function mountHiddenPrintViewer(
    href: string,
    callbacks?: {
        onPrintReady?: () => void;
        onPrintError?: (error: unknown) => void;
        onPrintStage?: (
            stage: SalesPrintStage,
            details?: SalesPrintStageDetails,
        ) => void;
    },
) {
    if (typeof document === "undefined") return false;

    const { createRoot } = await import("react-dom/client");
    const { SalesPrintShellViewer } =
        await import("@/modules/sales-print/ui/sales-print-shell-viewer");
    const { TRPCReactProvider } = await import("@/trpc/client");
    const { SessionProvider } = await import("@/lib/auth/client");

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
    let settled = false;

    const cleanup = () => {
        if (cleanupTimer) {
            window.clearTimeout(cleanupTimer);
            cleanupTimer = null;
        }
        root.unmount();
        host.remove();
    };

    const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        const error = new Error(
            "The print viewer is taking longer than expected.",
        );
        callbacks?.onPrintStage?.("print-timeout", {
            href,
            message: error.message,
            error,
        });
        callbacks?.onPrintError?.(error);
        cleanup();
    }, 20_000);

    root.render(
        createElement(
            SessionProvider,
            {
                refetchOnWindowFocus: false,
                refetchWhenOffline: false,
            },
            createElement(
                TRPCReactProvider,
                null,
                createElement(SalesPrintShellViewer, {
                    href,
                    onPrintReady: () => {
                        if (settled) return;
                        settled = true;
                        window.clearTimeout(timeout);
                        callbacks?.onPrintReady?.();
                        cleanupTimer = window.setTimeout(cleanup, 60_000);
                    },
                    onPrintError: (error: unknown) => {
                        if (settled) return;
                        settled = true;
                        window.clearTimeout(timeout);
                        callbacks?.onPrintError?.(error);
                        cleanup();
                    },
                    onPrintStage: callbacks?.onPrintStage,
                }),
            ),
        ),
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
