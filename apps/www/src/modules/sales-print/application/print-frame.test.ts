import { describe, expect, it } from "bun:test";
import { printLoadedFrame } from "./print-frame";

globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
	callback(0);
	return 0;
}) as typeof requestAnimationFrame;

describe("printLoadedFrame", () => {
	it("prints a loaded frame once and reports ready stages", async () => {
		const stages: string[] = [];
		let focused = false;
		let printed = false;
		let ready = false;
		const iframe = {
			contentDocument: {},
			contentWindow: {
				focus: () => {
					focused = true;
				},
				print: () => {
					printed = true;
				},
			},
		} as HTMLIFrameElement;

		await printLoadedFrame({
			iframe,
			href: "blob:test",
			settleMs: 0,
			onPrintReady: () => {
				ready = true;
			},
			onPrintStage: (stage) => {
				stages.push(stage);
			},
		});

		expect(focused).toBe(true);
		expect(printed).toBe(true);
		expect(ready).toBe(true);
		expect(stages).toEqual(["pdf-iframe-load", "print-dialog-called"]);
	});

	it("reports an error when the frame window is unavailable", async () => {
		const stages: string[] = [];
		let printError: unknown = null;
		const iframe = {
			contentDocument: {},
			contentWindow: null,
		} as HTMLIFrameElement;

		await printLoadedFrame({
			iframe,
			href: "blob:test",
			settleMs: 0,
			onPrintError: (error) => {
				printError = error;
			},
			onPrintStage: (stage) => {
				stages.push(stage);
			},
		});

		expect(printError).toBeInstanceOf(Error);
		expect(stages).toEqual(["pdf-iframe-load", "print-data-query-error"]);
	});
});
