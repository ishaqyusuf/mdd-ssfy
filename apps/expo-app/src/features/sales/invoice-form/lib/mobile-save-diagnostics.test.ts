import { describe, expect, it } from "bun:test";
import type { SaveDraftNewSalesFormPayload } from "../types";
import {
	attachMobileInvoiceSaveRequestId,
	classifyMobileInvoiceSaveError,
	createMobileInvoiceSaveRequestId,
	getMobileInvoiceSaveErrorMessage,
	summarizeMobileInvoiceSavePayload,
} from "./mobile-save-diagnostics";

function payload(): SaveDraftNewSalesFormPayload {
	return {
		type: "order",
		autosave: false,
		meta: {},
		lineItems: [
			{
				uid: "line-1",
				title: "Mixed",
				qty: 1,
				unitPrice: 100,
				lineTotal: 100,
				meta: {
					mouldingRows: [{ uid: "m-1" }],
					serviceRows: [{ uid: "s-1" }, { uid: "s-2" }],
				},
				formSteps: [{ uid: "step-1" }],
				shelfItems: [{ productId: 1 }],
				housePackageTool: { doors: [{ id: 1 }] },
			},
		],
		extraCosts: [{ label: "Delivery", type: "Delivery", amount: 10 }],
		summary: { subTotal: 100, taxRate: 0, taxTotal: 0, grandTotal: 110 },
	};
}

describe("mobile invoice save diagnostics", () => {
	it("summarizes payload shape without customer or line text", () => {
		const summary = summarizeMobileInvoiceSavePayload(payload());

		expect(summary.lineItemCount).toBe(1);
		expect(summary.workflowLineCount).toBe(1);
		expect(summary.shelfLineCount).toBe(1);
		expect(summary.hptLineCount).toBe(1);
		expect(summary.mouldingRowCount).toBe(1);
		expect(summary.serviceRowCount).toBe(2);
		expect(summary.extraCostCount).toBe(1);
		expect(summary.payloadBytes).toBeGreaterThan(0);
	});

	it("attaches a stable request id without changing the save shape", () => {
		const requestId = createMobileInvoiceSaveRequestId(123);
		const next = attachMobileInvoiceSaveRequestId(payload(), requestId);

		expect(requestId).toMatch(/^mobile-save-3f-[a-z0-9]+-[a-z0-9]+$/);
		expect(next.clientRequestId).toBe(requestId);
		expect(next.lineItems).toEqual(payload().lineItems);
	});

	it("classifies timeout, conflict, auth, and validation failures", () => {
		const timeout = new Error("timed out");
		timeout.name = "MobileInvoiceSaveTimeoutError";
		expect(classifyMobileInvoiceSaveError(timeout)).toBe("timeout");
		expect(classifyMobileInvoiceSaveError({ data: { code: "CONFLICT" } })).toBe(
			"conflict",
		);
		expect(
			classifyMobileInvoiceSaveError({ data: { code: "UNAUTHORIZED" } }),
		).toBe("auth");
		expect(
			classifyMobileInvoiceSaveError({ data: { code: "BAD_REQUEST" } }),
		).toBe("validation");
		expect(
			classifyMobileInvoiceSaveError({ shape: { data: { code: "CONFLICT" } } }),
		).toBe("conflict");
		expect(
			classifyMobileInvoiceSaveError(new Error("Your form is out of date.")),
		).toBe("conflict");
	});

	it("returns actionable recovery copy for each failure class", () => {
		const timeout = new Error("timed out");
		timeout.name = "MobileInvoiceSaveTimeoutError";
		expect(getMobileInvoiceSaveErrorMessage(timeout, "invoice")).toContain(
			"Check your connection",
		);
		expect(
			getMobileInvoiceSaveErrorMessage({ data: { code: "CONFLICT" } }, "quote"),
		).toBe("This quote changed elsewhere. Reload it before saving again.");
		expect(
			getMobileInvoiceSaveErrorMessage(
				{ data: { code: "UNAUTHORIZED" } },
				"invoice",
			),
		).toContain("session expired");
		expect(
			getMobileInvoiceSaveErrorMessage(new Error("unexpected"), "invoice"),
		).toContain("Try again in a moment");
	});
});
