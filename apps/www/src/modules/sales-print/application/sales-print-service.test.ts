// @ts-nocheck
import { describe, expect, it } from "bun:test";
import type { ResolveSalesDocumentAccessResult } from "@gnd/api/utils/sales-document-access";
import {
	buildSalesDocumentRouteFromQuery,
	buildSalesPdfDownloadUrlFromQuery,
	prepareSalesHtmlPreview,
	resolveSalesHtmlPreviewAccess,
	resolveSalesPrintAccess,
	resolveSalesPrintMode,
} from "./sales-print-service";

describe("sales print service", () => {
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

	it("prepares HTML previews through lightweight token access", async () => {
		let snapshotAccessCalls = 0;
		let htmlPreviewAccessCalls = 0;
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
		expect(href).toBe(
			"http://localhost/p/sales-document-v2?token=preview-token-123",
		);
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
