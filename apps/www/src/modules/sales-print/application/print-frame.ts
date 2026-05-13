import type {
	SalesPrintStage,
	SalesPrintStageDetails,
} from "./sales-print-service";

export function waitForNextPrintFrame() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

export async function waitForPrintableFrame(iframe: HTMLIFrameElement) {
	await waitForNextPrintFrame();

	try {
		const iframeDocument = iframe.contentDocument;
		if (iframeDocument?.fonts?.ready) {
			await iframeDocument.fonts.ready;
		}
	} catch {
		// Browser PDF viewers can hide internals; iframe load still means the
		// blob/url was handed off to the viewer.
	}

	await waitForNextPrintFrame();
}

export async function printLoadedFrame(input: {
	iframe: HTMLIFrameElement;
	href: string;
	onPrintReady?: () => void;
	onPrintError?: (error: unknown) => void;
	onPrintStage?: (
		stage: SalesPrintStage,
		details?: SalesPrintStageDetails,
	) => void;
}) {
	input.onPrintStage?.("pdf-iframe-load", { href: input.href });

	try {
		await waitForPrintableFrame(input.iframe);
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
