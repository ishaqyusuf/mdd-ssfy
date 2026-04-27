import { resolveSalesDocumentAccessAction } from "@/actions/resolve-sales-document-access";
import type { PrintMode } from "@gnd/sales/print/types";
import { getBaseUrl } from "./base-url";
import { openLink } from "./open-link";

export interface QuickPrintOptions {
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
	/** Open the v2 PDF viewer (default: true) */
	v2?: boolean;
}

export type SalesPrintHelperOptions = Omit<QuickPrintOptions, "mode">;

/**
 * Generates a signed token and opens the sales print page in a new tab.
 * Pass v2=false to open the legacy invoice page instead.
 */
export async function quickPrint({
	salesIds,
	mode,
	dispatchId,
	v2 = true,
}: QuickPrintOptions): Promise<void> {
	const path = v2 ? "p/sales-invoice-v2" : "p/sales-invoice";
	const pendingWindow = openPendingPrintWindow();

	try {
		const access = await resolveSalesDocumentAccessAction({
			salesIds,
			mode,
			dispatchId: dispatchId ?? null,
			baseUrl: getBaseUrl(),
		});
		const href = buildPrintHref(
			path,
			access.kind === "legacy"
				? {
						token: access.accessToken,
						preview: false,
						templateId: "template-2",
					}
				: {
						accessToken: access.accessToken,
						preview: false,
						templateId: "template-2",
					},
		);

		if (pendingWindow && !pendingWindow.closed) {
			pendingWindow.location.replace(href);
			return;
		}

		openLink(href, null, true);
	} catch (error) {
		if (pendingWindow && !pendingWindow.closed) {
			pendingWindow.close();
		}
		throw error;
	}
}

export async function downloadSalesDocument({
	salesIds,
	mode,
	dispatchId,
}: Omit<QuickPrintOptions, "v2">): Promise<void> {
	const access = await resolveSalesDocumentAccessAction({
		salesIds,
		mode,
		dispatchId: dispatchId ?? null,
		baseUrl: getBaseUrl(),
	});

	downloadSilently(access.downloadUrl);
}

export function printOrder(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "invoice" });
}

export function printOrderWithPacking(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "order-packing" });
}

export function printPackingSlip(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "packing-slip" });
}

export function printProduction(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "production" });
}

export function printQuote(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "quote" });
}

export const salesPrintHelper = {
	printOrder,
	printOrderWithPacking,
	printPackingSlip,
	printProduction,
	printQuote,
	downloadSalesDocument,
};

function downloadSilently(url: string) {
	const iframe = document.createElement("iframe");
	iframe.hidden = true;
	iframe.src = url;
	document.body.appendChild(iframe);

	setTimeout(() => {
		iframe.remove();
	}, 60_000);
}

function buildPrintHref(
	path: string,
	query: Record<string, string | boolean>,
): string {
	const url = new URL(path, window.location.origin);
	for (const [key, value] of Object.entries(query)) {
		url.searchParams.set(key, String(value));
	}
	return url.toString();
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
