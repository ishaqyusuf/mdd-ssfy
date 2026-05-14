// @ts-nocheck
import { describe, expect, it } from "bun:test";
import type { ResolveSalesDocumentAccessResult } from "@gnd/api/utils/sales-document-access";
import { parseSalesPrintRequest } from "./sales-print-request";
import {
	buildSalesDocumentRouteFromQuery,
	buildSalesPdfDownloadUrlFromQuery,
	openSalesPrintDocument,
	prepareSalesHtmlPreview,
	regenerateSalesPrintDocument,
	resolveSalesHtmlPreviewAccess,
	resolveSalesPrintAccess,
	resolveSalesPrintMode,
} from "./sales-print-service";

describe("sales print service", () => {
	it("classifies access-token print links as stored PDFs", () => {
		const request = parseSalesPrintRequest({
			accessToken: "access-123",
			mode: "invoice",
		});

		expect(request.isValid).toBe(true);
		expect(request.locatorType).toBe("access-token");
		expect(request.renderMode).toBe("stored-pdf");
		expect(request.params.templateId).toBe("template-2");
		expect(request.params.mode).toBe("invoice");
	});

	it("classifies preview access-token links as rendered PDFs", () => {
		const request = parseSalesPrintRequest({
			accessToken: "access-123",
			preview: "true",
			mode: "invoice",
		});

		expect(request.isValid).toBe(true);
		expect(request.locatorType).toBe("access-token");
		expect(request.renderMode).toBe("rendered-pdf");
	});

	it("classifies packing slip access-token print links as stored PDFs", () => {
		const request = parseSalesPrintRequest({
			accessToken: "access-123",
			mode: "packing-slip",
		});

		expect(request.isValid).toBe(true);
		expect(request.locatorType).toBe("access-token");
		expect(request.renderMode).toBe("stored-pdf");
	});

	it("classifies public, legacy, and snapshot locators as rendered PDFs", () => {
		expect(parseSalesPrintRequest({ pt: "public-123" }).renderMode).toBe(
			"rendered-pdf",
		);
		expect(parseSalesPrintRequest({ token: "legacy-123" }).renderMode).toBe(
			"rendered-pdf",
		);
		expect(
			parseSalesPrintRequest({ snapshotId: "snapshot-123" }).renderMode,
		).toBe("rendered-pdf");
	});

	it("marks missing and conflicting locators as invalid", () => {
		const missing = parseSalesPrintRequest({});
		const conflicting = parseSalesPrintRequest({
			accessToken: "access-123",
			pt: "public-123",
		});

		expect(missing.isValid).toBe(false);
		expect(missing.invalidReason).toBe("missing-locator");
		expect(conflicting.isValid).toBe(false);
		expect(conflicting.invalidReason).toBe("multiple-locators");
	});

	it("normalizes legacy UI modes to canonical print modes", () => {
		expect(resolveSalesPrintMode("order")).toBe("invoice");
		expect(resolveSalesPrintMode("packing list")).toBe("packing-slip");
		expect(resolveSalesPrintMode("order-packing")).toBe("order-packing");
		expect(resolveSalesPrintMode(undefined, "quote")).toBe("quote");
	});

	it("builds viewer urls from shared query inputs", () => {
		expect(
			buildSalesDocumentRouteFromQuery({
				accessToken: "access-123",
				preview: false,
				mode: "invoice",
				templateId: "template-2",
				origin: "https://app.example.com",
			}),
		).toBe(
			"https://app.example.com/p/sales-invoice-v2?accessToken=access-123&preview=false&mode=invoice",
		);

		expect(
			buildSalesDocumentRouteFromQuery({
				pt: "public-123",
				preview: true,
				templateId: "template-7",
				origin: "https://app.example.com",
			}),
		).toBe(
			"https://app.example.com/p/sales-invoice-v2?pt=public-123&preview=true&templateId=template-7",
		);
	});

	it("builds download urls from shared query inputs", () => {
		expect(
			buildSalesPdfDownloadUrlFromQuery({
				accessToken: "access-123",
				templateId: "template-2",
				preview: true,
				origin: "https://app.example.com",
			}),
		).toBe(
			"https://app.example.com/api/download/sales-v2?accessToken=access-123&preview=true",
		);

		expect(
			buildSalesPdfDownloadUrlFromQuery({
				pt: "public-123",
				templateId: "template-7",
				origin: "https://app.example.com",
			}),
		).toBe(
			"https://app.example.com/api/download/sales-v2?pt=public-123&preview=false&templateId=template-7",
		);
	});

	it("builds same-origin relative urls when no origin is supplied", () => {
		expect(
			buildSalesDocumentRouteFromQuery({
				accessToken: "access-123",
				preview: false,
				mode: "invoice",
			}),
		).toBe(
			"/p/sales-invoice-v2?accessToken=access-123&preview=false&mode=invoice",
		);

		expect(
			buildSalesPdfDownloadUrlFromQuery({
				accessToken: "access-123",
				preview: true,
			}),
		).toBe("/api/download/sales-v2?accessToken=access-123&preview=true");
	});

	it("deduplicates concurrent access resolution for the same document request", async () => {
		let calls = 0;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-1",
			accessToken: "access-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-123",
		};

		const dependencies = {
			resolveAccess: async () => {
				calls += 1;
				await Promise.resolve();
				return response;
			},
			resolveHtmlPreviewAccess: async () => response,
			openLink: () => undefined,
			getBaseUrl: () => "https://app.example.com",
		};

		const [first, second] = await Promise.all([
			resolveSalesPrintAccess(
				{ salesIds: [42], mode: "invoice" },
				dependencies,
			),
			resolveSalesPrintAccess(
				{ salesIds: [42], mode: "invoice" },
				dependencies,
			),
		]);

		expect(calls).toBe(1);
		expect(first).toBe(response);
		expect(second).toBe(response);
	});

	it("passes force regeneration through the shared access resolver", async () => {
		let forceRegenerate: boolean | undefined;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: true,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-2",
			accessToken: "access-456",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-456",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-456",
		};

		const dependencies = {
			resolveAccess: async (input) => {
				forceRegenerate = input.forceRegenerate;
				return response;
			},
			resolveHtmlPreviewAccess: async () => response,
			openLink: () => undefined,
			getBaseUrl: () => "https://app.example.com",
		};

		const access = await regenerateSalesPrintDocument(
			{ salesIds: [42], mode: "invoice" },
			dependencies,
		);

		expect(access).toBe(response);
		expect(forceRegenerate).toBe(true);
	});

	it("passes force regeneration through print requests", async () => {
		let forceRegenerate: boolean | undefined;
		let replacedHref: string | null = null;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: true,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-2",
			accessToken: "access-456",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-456",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-456",
		};
		const pendingWindow = {
			closed: false,
			location: {
				replace: (href: string) => {
					replacedHref = href;
				},
			},
			close: () => undefined,
		};
		const dependencies = {
			resolveAccess: async (input) => {
				forceRegenerate = input.forceRegenerate;
				return response;
			},
			resolveHtmlPreviewAccess: async () => response,
			openLink: () => undefined,
			openViewerShell: () => false,
			openPendingPrintWindow: () => pendingWindow,
			createPrintViewerContent: (href) => ({ props: { href } }),
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: false,
		};

		await openSalesPrintDocument(
			{ salesIds: [42], mode: "invoice", forceRegenerate: true },
			dependencies,
		);

		expect(forceRegenerate).toBe(true);
		expect(replacedHref).toBe(
			"/p/sales-invoice-v2?accessToken=access-456&preview=false&mode=invoice",
		);
	});

	it("mounts a hidden print viewer instead of showing a PDF preview when the attachment overlay is enabled", async () => {
		let openedViewerHref: string | null = null;
		let openedLinkHref: string | null = null;
		let pendingWindowOpened = false;
		let printReady = false;
		const viewerSubtitles: string[] = [];
		const stages: string[] = [];
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-1",
			accessToken: "access-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-123",
		};
		const dependencies = {
			resolveAccess: async () => response,
			resolveHtmlPreviewAccess: async () => response,
			openLink: (href) => {
				openedLinkHref = href;
			},
			openViewerShell: (input) => {
				viewerSubtitles.push(input.subtitle);
				return true;
			},
			openPendingPrintWindow: () => {
				pendingWindowOpened = true;
				return null;
			},
			createPrintViewerContent: (href) => ({ props: { href } }),
			mountHiddenPrintViewer: (href, callbacks) => {
				openedViewerHref = href;
				callbacks?.onPrintStage?.("print-data-query-start", { href });
				callbacks?.onPrintStage?.("pdf-iframe-load", { href });
				callbacks?.onPrintReady?.();
				return true;
			},
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: true,
		};

		await openSalesPrintDocument(
			{
				salesIds: [42],
				mode: "invoice",
				onPrintReady: () => {
					printReady = true;
				},
				onPrintStage: (stage) => {
					stages.push(stage);
				},
			},
			dependencies,
		);

		expect(openedViewerHref).toBe(
			"/p/sales-invoice-v2?accessToken=access-123&preview=false&mode=invoice",
		);
		expect(viewerSubtitles).toEqual([]);
		expect(openedLinkHref).toBe(null);
		expect(pendingWindowOpened).toBe(false);
		expect(printReady).toBe(true);
		expect(stages).toEqual([
			"resolve-access-start",
			"resolve-access-done",
			"print-data-query-start",
			"pdf-iframe-load",
			"hidden-viewer-mounted",
		]);
	});

	it("reports hidden viewer timeout stages through the attachment overlay", async () => {
		let printError: unknown = null;
		const stages: string[] = [];
		const response: ResolveSalesDocumentAccessResult = {
			kind: "legacy",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: null,
			accessToken: "legacy-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?token=legacy-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?token=legacy-123",
		};
		const dependencies = {
			resolveAccess: async () => response,
			resolveHtmlPreviewAccess: async () => response,
			openLink: () => undefined,
			openViewerShell: () => false,
			openPendingPrintWindow: () => null,
			createPrintViewerContent: (href) => ({ props: { href } }),
			mountHiddenPrintViewer: (href, callbacks) => {
				const error = new Error(
					"The print viewer is taking longer than expected.",
				);
				callbacks?.onPrintStage?.("print-timeout", {
					href,
					error,
					message: error.message,
				});
				callbacks?.onPrintError?.(error);
				return true;
			},
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: true,
		};

		await openSalesPrintDocument(
			{
				salesIds: [42, 43],
				mode: "invoice",
				onPrintError: (error) => {
					printError = error;
				},
				onPrintStage: (stage) => {
					stages.push(stage);
				},
			},
			dependencies,
		);

		expect(printError).toBeInstanceOf(Error);
		expect(stages).toEqual([
			"resolve-access-start",
			"resolve-access-done",
			"print-timeout",
			"hidden-viewer-mounted",
		]);
	});

	it("reports access resolution errors before surfacing print failure", async () => {
		const stages: string[] = [];
		const error = new Error("access failed");
		const dependencies = {
			resolveAccess: async () => {
				throw error;
			},
			resolveHtmlPreviewAccess: async () => null,
			openLink: () => undefined,
			openViewerShell: () => false,
			openPendingPrintWindow: () => null,
			createPrintViewerContent: (href) => ({ props: { href } }),
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: true,
		};

		await expect(
			openSalesPrintDocument(
				{
					salesIds: [42],
					mode: "invoice",
					onPrintStage: (stage) => {
						stages.push(stage);
					},
				},
				dependencies,
			),
		).rejects.toThrow("access failed");

		expect(stages).toEqual(["resolve-access-start", "resolve-access-error"]);
	});

	it("falls back to new-tab print when the attachment overlay provider is unavailable", async () => {
		let openedLinkHref: string | null = null;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-1",
			accessToken: "access-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-123",
		};
		const dependencies = {
			resolveAccess: async () => response,
			resolveHtmlPreviewAccess: async () => response,
			openLink: (href, _query, newTab) => {
				openedLinkHref = `${href}|${newTab}`;
			},
			openViewerShell: () => false,
			openPendingPrintWindow: () => null,
			createPrintViewerContent: (href) => ({ props: { href } }),
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: true,
		};

		await openSalesPrintDocument(
			{ salesIds: [42], mode: "invoice" },
			dependencies,
		);

		expect(openedLinkHref).toBe(
			"/p/sales-invoice-v2?accessToken=access-123&preview=false&mode=invoice|true",
		);
	});

	it("opens shift-click print requests in a pending browser tab instead of the attachment overlay", async () => {
		let openedViewer = false;
		let replacedHref: string | null = null;
		let openedLinkHref: string | null = null;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-1",
			accessToken: "access-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-123",
		};
		const pendingWindow = {
			closed: false,
			location: {
				replace: (href: string) => {
					replacedHref = href;
				},
			},
			close: () => undefined,
		};
		const dependencies = {
			resolveAccess: async () => response,
			resolveHtmlPreviewAccess: async () => response,
			openLink: (href) => {
				openedLinkHref = href;
			},
			openViewerShell: () => {
				openedViewer = true;
				return true;
			},
			openPendingPrintWindow: () => pendingWindow,
			createPrintViewerContent: (href) => ({ props: { href } }),
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: true,
		};

		await openSalesPrintDocument(
			{ salesIds: [42], mode: "invoice", openInNewTab: true },
			dependencies,
		);

		expect(replacedHref).toBe(
			"/p/sales-invoice-v2?accessToken=access-123&preview=false&mode=invoice",
		);
		expect(openedViewer).toBe(false);
		expect(openedLinkHref).toBe(null);
	});

	it("falls back to a new-tab link for shift-click print requests when a pending tab is unavailable", async () => {
		let openedViewer = false;
		let openedLinkHref: string | null = null;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-1",
			accessToken: "access-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-123",
		};
		const dependencies = {
			resolveAccess: async () => response,
			resolveHtmlPreviewAccess: async () => response,
			openLink: (href, _query, newTab) => {
				openedLinkHref = `${href}|${newTab}`;
			},
			openViewerShell: () => {
				openedViewer = true;
				return true;
			},
			openPendingPrintWindow: () => null,
			createPrintViewerContent: (href) => ({ props: { href } }),
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: true,
		};

		await openSalesPrintDocument(
			{ salesIds: [42], mode: "invoice", openInNewTab: true },
			dependencies,
		);

		expect(openedLinkHref).toBe(
			"/p/sales-invoice-v2?accessToken=access-123&preview=false&mode=invoice|true",
		);
		expect(openedViewer).toBe(false);
	});

	it("uses the legacy pending print window when the attachment overlay is disabled", async () => {
		let openedViewer = false;
		let replacedHref: string | null = null;
		let openedLinkHref: string | null = null;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-1",
			accessToken: "access-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?accessToken=access-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-123",
		};
		const pendingWindow = {
			closed: false,
			location: {
				replace: (href: string) => {
					replacedHref = href;
				},
			},
			close: () => undefined,
		};
		const dependencies = {
			resolveAccess: async () => response,
			resolveHtmlPreviewAccess: async () => response,
			openLink: (href) => {
				openedLinkHref = href;
			},
			openViewerShell: () => {
				openedViewer = true;
				return true;
			},
			openPendingPrintWindow: () => pendingWindow,
			createPrintViewerContent: (href) => ({ props: { href } }),
			getBaseUrl: () => "https://app.example.com",
			useAttachmentOverlay: false,
		};

		await openSalesPrintDocument(
			{ salesIds: [42], mode: "invoice" },
			dependencies,
		);

		expect(replacedHref).toBe(
			"/p/sales-invoice-v2?accessToken=access-123&preview=false&mode=invoice",
		);
		expect(openedViewer).toBe(false);
		expect(openedLinkHref).toBe(null);
	});

	it("prepares HTML previews through snapshot access", async () => {
		let snapshotAccessCalls = 0;
		let htmlPreviewAccessCalls = 0;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "snapshot",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			snapshotId: "snapshot-1",
			accessToken: "access-123",
			expiresAt: null,
			previewUrl: "https://app.example.com/p/sales-document-v2?pt=public-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?pt=public-123&preview=false",
		};
		const dependencies = {
			resolveAccess: async () => {
				snapshotAccessCalls += 1;
				return response;
			},
			resolveHtmlPreviewAccess: async () => {
				htmlPreviewAccessCalls += 1;
				return response;
			},
			openLink: () => undefined,
			getBaseUrl: () => "https://app.example.com",
		};

		const href = await prepareSalesHtmlPreview(
			{ salesIds: [42], mode: "invoice" },
			dependencies,
		);

		expect(snapshotAccessCalls).toBe(0);
		expect(htmlPreviewAccessCalls).toBe(1);
		expect(href).toBe("/p/sales-document-v2?accessToken=access-123");
	});

	it("deduplicates concurrent HTML preview access resolution", async () => {
		let calls = 0;
		const response: ResolveSalesDocumentAccessResult = {
			kind: "legacy",
			generated: false,
			mode: "invoice",
			documentType: "invoice_pdf",
			salesOrderId: 42,
			accessToken: "preview-token-123",
			expiresAt: null,
			previewUrl:
				"https://app.example.com/p/sales-document-v2?token=preview-token-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?token=preview-token-123",
		};
		const dependencies = {
			resolveAccess: async () => response,
			resolveHtmlPreviewAccess: async () => {
				calls += 1;
				await Promise.resolve();
				return response;
			},
			openLink: () => undefined,
			getBaseUrl: () => "https://app.example.com",
		};

		const [first, second] = await Promise.all([
			resolveSalesHtmlPreviewAccess(
				{ salesIds: [42], mode: "invoice" },
				dependencies,
			),
			resolveSalesHtmlPreviewAccess(
				{ salesIds: [42], mode: "invoice" },
				dependencies,
			),
		]);

		expect(calls).toBe(1);
		expect(first).toBe(response);
		expect(second).toBe(response);
	});
});
