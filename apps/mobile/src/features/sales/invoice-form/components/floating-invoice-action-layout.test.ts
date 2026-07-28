import { describe, expect, it } from "bun:test";
import {
	INVOICE_FLOATING_BASE_OFFSET,
	INVOICE_FLOATING_HIDDEN_FOOTER_SHIFT,
	INVOICE_FLOATING_INLINE_PROCEED_HIDDEN_OFFSET,
	INVOICE_FLOATING_INLINE_PROCEED_OFFSET,
	INVOICE_FLOATING_OVERLAY_PROCEED_OFFSET,
	INVOICE_FLOATING_SECONDARY_OFFSET,
	INVOICE_FLOATING_TERTIARY_OFFSET,
	INVOICE_FOOTER_ACTION_HEIGHT,
	getCustomComponentFloatingOffset,
	getInvoiceFloatingActionOffset,
	getWorkflowProceedFloatingOffset,
} from "./floating-invoice-action-layout";

describe("floating invoice action layout", () => {
	it("keeps centered invoice actions on predictable stacked lanes", () => {
		expect(getInvoiceFloatingActionOffset("primary")).toBe(136);
		expect(getInvoiceFloatingActionOffset("secondary")).toBe(200);
		expect(getInvoiceFloatingActionOffset("tertiary")).toBe(264);
		expect(getInvoiceFloatingActionOffset("overlayProceed")).toBe(44);
		expect(INVOICE_FOOTER_ACTION_HEIGHT).toBe(44);
		expect(INVOICE_FLOATING_INLINE_PROCEED_OFFSET).toBe(
			INVOICE_FOOTER_ACTION_HEIGHT + 15,
		);
		expect(INVOICE_FLOATING_INLINE_PROCEED_HIDDEN_OFFSET).toBe(20);
		expect(
			INVOICE_FLOATING_SECONDARY_OFFSET - INVOICE_FLOATING_BASE_OFFSET,
		).toBe(64);
		expect(
			INVOICE_FLOATING_TERTIARY_OFFSET - INVOICE_FLOATING_SECONDARY_OFFSET,
		).toBe(64);
	});

	it("stacks custom above proceed when both are visible", () => {
		expect(getWorkflowProceedFloatingOffset({ inline: true })).toBe(
			INVOICE_FLOATING_INLINE_PROCEED_OFFSET,
		);
		expect(getWorkflowProceedFloatingOffset({ inline: false })).toBe(
			INVOICE_FLOATING_OVERLAY_PROCEED_OFFSET,
		);
		expect(getCustomComponentFloatingOffset({ proceedVisible: true })).toBe(
			INVOICE_FLOATING_TERTIARY_OFFSET,
		);
		expect(getCustomComponentFloatingOffset({ proceedVisible: false })).toBe(
			INVOICE_FLOATING_BASE_OFFSET,
		);
		expect(
			getCustomComponentFloatingOffset({
				inline: true,
				proceedVisible: false,
			}),
		).toBe(INVOICE_FLOATING_INLINE_PROCEED_OFFSET);
	});

	it("moves centered floating actions lower when footer actions are hidden", () => {
		expect(
			getWorkflowProceedFloatingOffset({
				inline: true,
				footerActionsHidden: true,
			}),
		).toBe(INVOICE_FLOATING_INLINE_PROCEED_HIDDEN_OFFSET);
		expect(
			getCustomComponentFloatingOffset({
				inline: true,
				proceedVisible: false,
				footerActionsHidden: true,
			}),
		).toBe(INVOICE_FLOATING_INLINE_PROCEED_HIDDEN_OFFSET);
		expect(
			getCustomComponentFloatingOffset({
				proceedVisible: true,
				footerActionsHidden: true,
			}),
		).toBe(
			INVOICE_FLOATING_TERTIARY_OFFSET - INVOICE_FLOATING_HIDDEN_FOOTER_SHIFT,
		);
	});
});
