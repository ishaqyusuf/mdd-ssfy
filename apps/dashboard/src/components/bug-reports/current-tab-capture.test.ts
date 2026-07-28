import { describe, expect, test } from "bun:test";
import {
	TAB_RECORDING_FRAME_RATE,
	canvasToPngBlob,
	captureCurrentTabCanvas,
	createCurrentTabRecordingCanvas,
	drawCurrentTabFrame,
	getCaptureViewport,
	isBugReportCaptureExcluded,
} from "./current-tab-capture";

const renderedCanvas = {
	kind: "rendered-canvas",
} as unknown as HTMLCanvasElement;

const originalDescriptors = new Map<string, PropertyDescriptor | undefined>();
type AnyFunction = (...args: never[]) => unknown;
type Spy<T extends AnyFunction> = T & { calls: Parameters<T>[] };

function createSpy<T extends AnyFunction>(implementation: T): Spy<T> {
	const calls: Parameters<T>[] = [];
	const spy = ((...args: Parameters<T>) => {
		calls.push(args);
		return implementation(...args);
	}) as Spy<T>;
	spy.calls = calls;
	return spy;
}

function setGlobal(name: string, value: unknown) {
	if (!originalDescriptors.has(name)) {
		originalDescriptors.set(
			name,
			Object.getOwnPropertyDescriptor(globalThis, name),
		);
	}
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value,
		writable: true,
	});
}

function restoreGlobals() {
	for (const [name, descriptor] of originalDescriptors) {
		if (descriptor) {
			Object.defineProperty(globalThis, name, descriptor);
		} else {
			Reflect.deleteProperty(globalThis, name);
		}
	}
	originalDescriptors.clear();
}

async function withGlobalCleanup<T>(callback: () => T | Promise<T>) {
	try {
		return await callback();
	} finally {
		restoreGlobals();
	}
}

function createElementStub(input: {
	className?: string;
	closest?: Record<string, unknown>;
	role?: string | null;
	textContent?: string;
}) {
	return {
		className: input.className ?? "",
		closest(selector: string) {
			return input.closest?.[selector] ?? null;
		},
		getAttribute(name: string) {
			return name === "role" ? (input.role ?? null) : null;
		},
		textContent: input.textContent ?? "",
	} as HTMLElement;
}

function installDomStubs() {
	const documentElement = {
		scrollHeight: 1800,
		scrollLeft: 9,
		scrollTop: 11,
		scrollWidth: 2200,
	};
	const body = createElementStub({});
	const createdCanvases: HTMLCanvasElement[] = [];

	setGlobal("window", {
		devicePixelRatio: 3,
		innerHeight: 720,
		innerWidth: 1280,
		scrollX: 17,
		scrollY: 29,
	});
	setGlobal("document", {
		body,
		createElement(tagName: string) {
			if (tagName !== "canvas") {
				throw new Error(`Unexpected element: ${tagName}`);
			}
			const canvas = {
				height: 0,
				width: 0,
			} as HTMLCanvasElement;
			createdCanvases.push(canvas);
			return canvas;
		},
		documentElement,
	});
	setGlobal("getComputedStyle", () => ({
		backgroundColor: "rgb(255, 255, 255)",
	}));

	return { body, createdCanvases, documentElement };
}

describe("current tab bug-report capture", () => {
	test("captures the current DOM viewport without using display-media picker APIs", async () => {
		await withGlobalCleanup(async () => {
			const { body, documentElement } = installDomStubs();
			const getDisplayMedia = createSpy(() => {
				throw new Error("getDisplayMedia should not be called");
			});
			const renderToCanvas = createSpy(
				async (_target: unknown, _options: unknown) => renderedCanvas,
			);
			setGlobal("navigator", {
				mediaDevices: {
					getDisplayMedia,
				},
			});

			const canvas = await captureCurrentTabCanvas({ renderToCanvas });

			expect(canvas).toBe(renderedCanvas);
			expect(getDisplayMedia.calls.length).toBe(0);
			expect(renderToCanvas.calls.length).toBe(1);
			const [target, options] = renderToCanvas.calls[0] as [
				typeof documentElement,
				{
					backgroundColor: string;
					canvasHeight: number;
					canvasWidth: number;
					filter: (node: HTMLElement) => boolean;
					height: number;
					pixelRatio: number;
					style: Record<string, string>;
					width: number;
				},
			];
			expect(target).toBe(documentElement);
			expect(options.backgroundColor).toBe("rgb(255, 255, 255)");
			expect(options.canvasHeight).toBe(720);
			expect(options.canvasWidth).toBe(1280);
			expect(options.height).toBe(720);
			expect(options.width).toBe(1280);
			expect(options.pixelRatio).toBe(2);
			expect(options.style).toEqual({
				height: "1800px",
				transform: "translate(-17px, -29px)",
				transformOrigin: "top left",
				width: "2200px",
			});
			expect(options.filter(body as HTMLElement)).toBe(true);
			expect(
				options.filter(
					createElementStub({
						closest: {
							'[data-bug-report-ignore="true"]': {},
						},
					}),
				),
			).toBe(false);
		});
	});

	test("excludes bug-report chrome and overlay nodes from captured frames", () => {
		expect(
			isBugReportCaptureExcluded(
				createElementStub({
					closest: {
						'[data-bug-report-ignore="true"]': {},
					},
				}),
			),
		).toBe(true);
		expect(
			isBugReportCaptureExcluded(
				createElementStub({
					closest: {
						"[data-radix-portal]": {
							textContent: "Report a bug",
						},
					},
				}),
			),
		).toBe(true);
		expect(
			isBugReportCaptureExcluded(createElementStub({ role: "dialog" })),
		).toBe(true);
		expect(
			isBugReportCaptureExcluded(
				createElementStub({
					className: "fixed inset-0 z-50 bg-black/80",
				}),
			),
		).toBe(true);
		expect(isBugReportCaptureExcluded(createElementStub({}))).toBe(false);
	});

	test("creates a viewport-sized recording canvas for current-tab captureStream", () => {
		withGlobalCleanup(() => {
			const { createdCanvases } = installDomStubs();

			const canvas = createCurrentTabRecordingCanvas();

			expect(createdCanvases).toEqual([canvas]);
			expect(canvas.width).toBe(1280);
			expect(canvas.height).toBe(720);
			expect(TAB_RECORDING_FRAME_RATE).toBe(4);
		});
	});

	test("draws captured DOM frames into the recording canvas", async () => {
		const clearRect = createSpy(() => undefined);
		const drawImage = createSpy(() => undefined);
		const recordingCanvas = {
			getContext: () => ({
				clearRect,
				drawImage,
			}),
			height: 720,
			width: 1280,
		} as unknown as HTMLCanvasElement;
		const frameCanvas = { kind: "frame" } as unknown as HTMLCanvasElement;

		await drawCurrentTabFrame(recordingCanvas, async () => frameCanvas);

		expect(clearRect.calls).toEqual([[0, 0, 1280, 720]]);
		expect(drawImage.calls).toEqual([[frameCanvas, 0, 0, 1280, 720]]);
	});

	test("converts screenshot canvases to png blobs", async () => {
		const blob = new Blob(["png"], { type: "image/png" });
		const toBlobCalls: Array<
			[BlobCallback, string | undefined, number | undefined]
		> = [];
		const toBlob = (
			callback: BlobCallback,
			contentType?: string,
			quality?: number,
		) => {
			toBlobCalls.push([callback, contentType, quality]);
			expect(contentType).toBe("image/png");
			expect(quality).toBe(0.92);
			callback(blob);
		};

		const result = await canvasToPngBlob({
			toBlob,
		} as unknown as HTMLCanvasElement);

		expect(result).toBe(blob);
		expect(toBlobCalls.length).toBe(1);
	});

	test("falls back to document scroll offsets and minimum viewport dimensions", () => {
		withGlobalCleanup(() => {
			setGlobal("window", {
				innerHeight: 0,
				innerWidth: 0,
				scrollX: 0,
				scrollY: 0,
			});
			setGlobal("document", {
				documentElement: {
					scrollLeft: 45,
					scrollTop: 67,
				},
			});

			expect(getCaptureViewport()).toEqual({
				height: 1,
				scrollX: 45,
				scrollY: 67,
				width: 1,
			});
		});
	});
});
