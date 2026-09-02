import { describe, expect, test } from "bun:test";

import type { SalesCompletionProjection } from "@gnd/sales/sales-completion";

import {
	applyFulfillmentCompletionProjection,
	applyProductionCompletionProjection,
	canShowStatusOnlyCompletionChoice,
	formatSalesCompletionDate,
	fromSalesCompletionDateValue,
	getDefaultSalesCompletionChoice,
	toSalesCompletionDateValue,
} from "./sales-completion-presentation";

const actions = [
	{ action: "production_completed" as const, label: "Production completed" },
	{ action: "fulfilled" as const, label: "Fulfilled" },
];

function projection(
	overrides: Partial<SalesCompletionProjection> = {},
): SalesCompletionProjection {
	return {
		salesOrderId: 91,
		orderNo: "091LRG",
		orderCreatedAt: null,
		isRecentOrder: false,
		revision: "0".repeat(64),
		operationalProductionCompleted: false,
		canonicalFulfilled: false,
		productionCompletionSatisfied: true,
		fulfillmentCompletionSatisfied: false,
		fulfillmentDisposition: "PENDING",
		productionCompletionSource: "STATUS_ONLY",
		fulfillmentCompletionSource: "NONE",
		productionCompletionMethod: "STATUS_ONLY",
		fulfillmentMethod: null,
		productionEffectiveAt: null,
		fulfillmentEffectiveAt: null,
		productionRecordedAt: new Date("2026-08-01T12:00:00.000Z"),
		fulfillmentRecordedAt: null,
		availableActions: {
			markProductionStatusOnly: false,
			cancelProductionStatusOnly: true,
			productionCancellationBlockedReason: null,
			markFulfillmentStatusOnly: true,
			cancelFulfillmentStatusOnly: false,
		},
		activeProductionRecord: {
			id: "completion-1",
			requestId: "00000000-0000-4000-8000-000000000001",
			cancellationRequestId: null,
			salesOrderId: 91,
			milestone: "PRODUCTION_COMPLETED",
			completionMethod: "STATUS_ONLY",
			state: "ACTIVE",
			effectiveAt: null,
			recordedAt: new Date("2026-08-01T12:00:00.000Z"),
			recordedBy: { id: 7, name: "Admin" },
			cancelledAt: null,
			cancelledBy: null,
			cancellationReason: null,
			updatedAt: new Date("2026-08-01T12:00:00.000Z"),
		},
		activeFulfillmentRecord: null,
		history: [],
		...overrides,
	};
}

describe("Sales completion confirmation presentation", () => {
	test("always starts on Full workflow", () => {
		expect(getDefaultSalesCompletionChoice()).toBe("FULL_WORKFLOW");
	});

	test("uses the current local calendar date for Fulfillment completion", () => {
		const localDate = new Date(2026, 8, 2, 23, 45);
		expect(toSalesCompletionDateValue(localDate)).toBe("2026-09-02");
		expect(fromSalesCompletionDateValue("2026-09-02")).toEqual(
			new Date(2026, 8, 2),
		);
		expect(formatSalesCompletionDate("2026-09-02")).toBe("Sep 2, 2026");
		expect(fromSalesCompletionDateValue("2026-02-31")).toBeUndefined();
	});

	test("shows status-only for authorized single and bulk selections", () => {
		expect(
			canShowStatusOnlyCompletionChoice({ canView: false, salesOrderCount: 1 }),
		).toBe(false);
		expect(
			canShowStatusOnlyCompletionChoice({ canView: true, salesOrderCount: 2 }),
		).toBe(true);
		expect(
			canShowStatusOnlyCompletionChoice({ canView: true, salesOrderCount: 1 }),
		).toBe(true);
		expect(
			canShowStatusOnlyCompletionChoice({ canView: true, salesOrderCount: 0 }),
		).toBe(false);
	});

	test("shows provenance, locks repeat marking, and offers method-aware cancellation", () => {
		const result = applyProductionCompletionProjection(
			actions,
			projection(),
			true,
		);

		expect(
			result.find((item) => item.action === "production_completed"),
		).toEqual({
			action: "production_completed",
			label: "Production completed — status only",
			disabled: true,
		});
		expect(result.find((item) => item.action === "cancel_production")).toEqual({
			action: "cancel_production",
			label: "Cancel Production status only",
			disabled: false,
		});
	});

	test("view-only users see provenance but cannot cancel", () => {
		const result = applyProductionCompletionProjection(
			actions,
			projection(),
			false,
		);
		expect(
			result.find((item) => item.action === "cancel_production")?.disabled,
		).toBe(true);
	});

	test("shows administrative Fulfillment provenance and method-aware cancellation", () => {
		const result = applyFulfillmentCompletionProjection(
			actions,
			projection({
				fulfillmentCompletionSatisfied: true,
				fulfillmentDisposition: "ADMINISTRATIVELY_COMPLETED",
				availableActions: {
					markProductionStatusOnly: false,
					cancelProductionStatusOnly: false,
					productionCancellationBlockedReason:
						"Cancel Fulfillment completion first.",
					markFulfillmentStatusOnly: false,
					cancelFulfillmentStatusOnly: true,
				},
				activeFulfillmentRecord: {
					...projection().activeProductionRecord!,
					milestone: "FULFILLMENT_COMPLETED",
					completionMethod: "STATUS_ONLY",
					recordedAt: new Date("2026-08-01T12:00:00.000Z"),
					recordedBy: { id: 7, name: "Admin" },
				},
			}),
			true,
		);

		expect(result.find((item) => item.action === "fulfilled")).toEqual({
			action: "fulfilled",
			label: "Fulfillment completed — status only",
			disabled: true,
		});
		expect(result.find((item) => item.action === "cancel_fulfillment")).toEqual(
			{
				action: "cancel_fulfillment",
				label: "Cancel Fulfillment status only",
				disabled: false,
			},
		);
	});

	test("canonical Fulfillment takes presentation precedence without hiding status-only cancellation", () => {
		const result = applyFulfillmentCompletionProjection(
			[
				...actions,
				{
					action: "cancel_fulfillment" as const,
					label: "Cancel fulfillment",
				},
			],
			projection({
				fulfillmentCompletionSatisfied: true,
				fulfillmentDisposition: "FULFILLED",
				availableActions: {
					markProductionStatusOnly: false,
					cancelProductionStatusOnly: false,
					productionCancellationBlockedReason:
						"Cancel Fulfillment completion first.",
					markFulfillmentStatusOnly: false,
					cancelFulfillmentStatusOnly: true,
				},
				activeFulfillmentRecord: {
					...projection().activeProductionRecord!,
					milestone: "FULFILLMENT_COMPLETED",
					completionMethod: "STATUS_ONLY",
				},
			}),
			false,
		);

		expect(result.find((item) => item.action === "fulfilled")?.label).toBe(
			"Fulfilled",
		);
		expect(
			result.find((item) => item.action === "cancel_fulfillment")?.disabled,
		).toBe(true);
		expect(
			result.find((item) => item.action === "cancel_fulfillment")?.label,
		).toBe("Cancel Fulfillment status only");
	});
});
