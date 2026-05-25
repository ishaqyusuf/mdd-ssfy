import { describe, expect, it } from "bun:test";
import {
	type SalesFormFloatingActionsVisibilityInput,
	resolveSalesFormFloatingActionsVisibility,
} from "./floating-actions";

function visibility(input: SalesFormFloatingActionsVisibilityInput) {
	return resolveSalesFormFloatingActionsVisibility(input);
}

describe("sales form floating actions gates", () => {
	it("shows only dealer-safe actions for dealership quotes", () => {
		expect(
			visibility({
				isSaved: true,
				canAddItem: true,
				canSaveDraft: true,
				hasPaymentAction: true,
				hasSavedRecordAction: false,
				enableSavedRecordActions: false,
				hasOverviewAction: true,
				hasPreviewAction: true,
				hasPrintAction: true,
				capabilities: {
					payments: false,
					printing: false,
					internalOverview: false,
				},
				permissions: {
					canSaveDraft: true,
					canTakePayment: false,
					canPrint: false,
					canOpenInternalOverview: false,
				},
			}),
		).toEqual({
			addItem: true,
			saveDraft: true,
			payment: false,
			savedRecord: false,
			overview: false,
			preview: false,
			print: false,
			moreMenu: false,
		});
	});

	it("allows www quote saved-record actions when capabilities and handlers exist", () => {
		expect(
			visibility({
				isSaved: true,
				canAddItem: true,
				canSaveDraft: true,
				hasSavedRecordAction: true,
				enableSavedRecordActions: true,
				hasOverviewAction: true,
				hasPreviewAction: true,
				hasPrintAction: true,
				capabilities: {
					printing: true,
					internalOverview: true,
				},
				permissions: {
					canSaveDraft: true,
					canPrint: true,
					canOpenInternalOverview: true,
				},
			}),
		).toEqual({
			addItem: true,
			saveDraft: true,
			payment: false,
			savedRecord: true,
			overview: true,
			preview: true,
			print: true,
			moreMenu: true,
		});
	});

	it("suppresses disabled capabilities even when actions are passed", () => {
		expect(
			visibility({
				isSaved: true,
				hasPaymentAction: true,
				enableSavedRecordActions: false,
				hasOverviewAction: true,
				hasPreviewAction: true,
				hasPrintAction: true,
				capabilities: {
					payments: false,
					printing: false,
					internalOverview: false,
				},
				permissions: {
					canTakePayment: true,
					canPrint: true,
					canOpenInternalOverview: true,
				},
			}),
		).toMatchObject({
			payment: false,
			overview: false,
			preview: false,
			print: false,
		});
	});
});
