import type {
	SalesPrintStage,
	SalesPrintStageDetails,
} from "./sales-print-service";

const DEFAULT_PRINT_RENDER_SETTLE_MS = 2500;

export function waitForNextPrintFrame() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

function waitForPrintSettle(ms: number) {
	if (ms <= 0) return Promise.resolve();
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

async function waitForDocumentImages(document: Document) {
	const images = Array.from(document.images ?? []);
	if (!images.length) return;

	await Promise.all(
		images.map((image) => {
			if (image.complete) return Promise.resolve();
			return new Promise<void>((resolve) => {
				image.addEventListener("load", () => resolve(), { once: true });
				image.addEventListener("error", () => resolve(), { once: true });
			});
		}),
	);
}

export async function waitForPrintableFrame(
	iframe: HTMLIFrameElement,
	settleMs = DEFAULT_PRINT_RENDER_SETTLE_MS,
) {
	await waitForNextPrintFrame();

	try {
		const iframeDocument = iframe.contentDocument;
		if (iframeDocument?.fonts?.ready) {
			await iframeDocument.fonts.ready;
		}
		if (iframeDocument) {
			await waitForDocumentImages(iframeDocument);
		}
	} catch {
		// Browser PDF viewers can hide internals; iframe load still means the
		// blob/url was handed off to the viewer.
	}

	await waitForNextPrintFrame();
	await waitForPrintSettle(settleMs);
	await waitForNextPrintFrame();
}

export async function printLoadedFrame(input: {
	iframe: HTMLIFrameElement;
	href: string;
	settleMs?: number;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
}) {
	input.onPrintStage?.("pdf-iframe-load", { href: input.href });

	try {
		await waitForPrintableFrame(input.iframe, input.settleMs);
		const printWindow = input.iframe.contentWindow;
		if (!printWindow) {
			throw new Error("The print frame is unavailable.");
		}
		printWindow.focus();
		printWindow.print();
		input.onPrintStage?.("print-dialog-called", { href: input.href });
		input.onPrintReady?.();
	} catch (error) {
		input.onPrintStage?.("print-data-query-error", {
			href: input.href,
			error,
		});
		input.onPrintError?.(error);
	}
}
