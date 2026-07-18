import { toCanvas } from "html-to-image";

export const TAB_RECORDING_FRAME_RATE = 4;
export const TAB_RECORDING_FRAME_INTERVAL_MS = 1_000 / TAB_RECORDING_FRAME_RATE;

const MAX_CAPTURE_PIXEL_RATIO = 2;
const TRANSPARENT_IMAGE_PLACEHOLDER =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
type RenderCurrentTabToCanvas = typeof toCanvas;

export function getCaptureViewport() {
	return {
		height: Math.max(window.innerHeight || 0, 1),
		scrollX: window.scrollX || document.documentElement.scrollLeft || 0,
		scrollY: window.scrollY || document.documentElement.scrollTop || 0,
		width: Math.max(window.innerWidth || 0, 1),
	};
}

export function isBugReportCaptureExcluded(node: HTMLElement) {
	if (node.closest('[data-bug-report-ignore="true"]')) return true;
	if (
		node.closest("[data-radix-portal]")?.textContent?.includes("Report a bug")
	) {
		return true;
	}
	if (node.getAttribute("role") === "dialog") return true;
	const className = typeof node.className === "string" ? node.className : "";
	return (
		className.includes("fixed") &&
		className.includes("z-50") &&
		className.includes("bg-black")
	);
}

export async function captureCurrentTabCanvas({
	renderToCanvas = toCanvas,
}: {
	renderToCanvas?: RenderCurrentTabToCanvas;
} = {}) {
	const target = document.documentElement;
	const viewport = getCaptureViewport();
	const backgroundColor =
		getComputedStyle(document.body).backgroundColor || "#ffffff";

	return renderToCanvas(target, {
		backgroundColor,
		cacheBust: true,
		canvasHeight: viewport.height,
		canvasWidth: viewport.width,
		filter(node) {
			return !isBugReportCaptureExcluded(node);
		},
		height: viewport.height,
		imagePlaceholder: TRANSPARENT_IMAGE_PLACEHOLDER,
		pixelRatio: Math.min(
			Math.max(window.devicePixelRatio || 1, 1),
			MAX_CAPTURE_PIXEL_RATIO,
		),
		style: {
			height: `${document.documentElement.scrollHeight}px`,
			transform: `translate(${-viewport.scrollX}px, ${-viewport.scrollY}px)`,
			transformOrigin: "top left",
			width: `${document.documentElement.scrollWidth}px`,
		},
		width: viewport.width,
	});
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement) {
	return new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, "image/png", 0.92);
	});
}

export function createCurrentTabRecordingCanvas() {
	const viewport = getCaptureViewport();
	const recordingCanvas = document.createElement("canvas");
	recordingCanvas.width = viewport.width;
	recordingCanvas.height = viewport.height;
	return recordingCanvas;
}

export async function drawCurrentTabFrame(
	recordingCanvas: HTMLCanvasElement,
	captureFrame: () => Promise<HTMLCanvasElement> = captureCurrentTabCanvas,
) {
	const frameCanvas = await captureFrame();
	const context = recordingCanvas.getContext("2d");
	if (!context) {
		throw new Error("Unable to prepare recording canvas.");
	}
	context.clearRect(0, 0, recordingCanvas.width, recordingCanvas.height);
	context.drawImage(
		frameCanvas,
		0,
		0,
		recordingCanvas.width,
		recordingCanvas.height,
	);
}
