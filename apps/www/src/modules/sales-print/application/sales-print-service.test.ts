// @ts-nocheck
import { describe, expect, it } from "bun:test";
import type { ResolveSalesDocumentAccessResult } from "@gnd/api/utils/sales-document-access";
import {
	buildSalesPdfDownloadUrlFromQuery,
	buildSalesDocumentRouteFromQuery,
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
				templateId: "template-2",
				origin: "https://app.example.com",
			}),
		).toBe(
			"https://app.example.com/p/sales-invoice-v2?accessToken=access-123&preview=false",
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
				origin: "https://app.example.com",
			}),
		).toBe(
			"https://app.example.com/api/download/sales-v2?accessToken=access-123&preview=false",
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
			previewUrl: "https://app.example.com/p/sales-document-v2?accessToken=access-123",
			downloadUrl:
				"https://app.example.com/api/download/sales-v2?accessToken=access-123",
		};

		const dependencies = {
			resolveAccess: async () => {
				calls += 1;
				await Promise.resolve();
				return response;
			},
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
});
