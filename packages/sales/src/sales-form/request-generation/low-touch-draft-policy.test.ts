import { describe, expect, test } from "bun:test";
import type { NewSalesFormSeedInitializationIssue } from "../application/new-sales-form-seed-initializer";
import type { NewSalesFormSeed } from "../contracts/new-sales-form-seed";
import {
	LOW_TOUCH_DRAFT_COMMAND_POLICY,
	evaluateSalesRequestLowTouchDraftEligibility,
} from "./low-touch-draft-policy";

const seed: NewSalesFormSeed = {
	schemaVersion: 2,
	lineItems: [
		{
			uid: "line-1",
			qty: 1,
			formSteps: [
				{ stepId: 1, prodUid: "exterior" },
				{ stepId: 2, prodUid: "fiberglass" },
			],
		},
	],
	unresolved: [],
};

function eligibleInput() {
	return {
		source: "pasted-text" as const,
		seed: structuredClone(seed),
		initialized: {
			unresolved: [],
			issues: [] as NewSalesFormSeedInitializationIssue[],
			record: {
				type: "order",
				form: { customerId: 101, customerProfileId: 7 },
				lineItems: [
					{
						uid: "line-1",
						title: "Exterior Door",
						qty: 1,
						unitPrice: 500,
						lineTotal: 500,
						formSteps: [],
					},
				],
				extraCosts: [],
				summary: { taxRate: 0, subTotal: 500, taxTotal: 0, grandTotal: 500 },
			},
		},
		current: {
			configuration: true,
			providerBenchmark: true,
			catalog: true,
			customer: true,
			customerProfile: true,
			prices: true,
			taxes: true,
			delivery: true,
			discounts: true,
			stock: true,
			permissions: true,
		},
	};
}

describe("Sales Request Generation low-touch draft policy", () => {
	test("allows only a current, fully resolved and priced pasted-text candidate", () => {
		const result = evaluateSalesRequestLowTouchDraftEligibility(
			eligibleInput(),
		);

		expect(result).toEqual({ eligible: true, reasons: [] });
		expect(LOW_TOUCH_DRAFT_COMMAND_POLICY).toEqual({
			prepareNativeDraft: true,
			previewInvoice: true,
			finalSave: "explicit-human-command",
			sendInvoice: "explicit-human-command",
			capturePayment: "explicit-human-command",
			allocateInventory: "explicit-human-command",
			productionAction: "explicit-human-command",
		});
	});

	test("blocks unresolved, custom, initializer, unpriced, and shelf facts", () => {
		const input = eligibleInput();
		input.seed.unresolved.push({
			lineUid: "line-1",
			stepId: null,
			field: "handing",
			status: "ambiguous",
			reason: "Handing was not specified.",
		});
		const seedLine = input.seed.lineItems[0];
		if (!seedLine) throw new Error("Expected the test seed line.");
		seedLine.formSteps.push({ stepId: 3, value: "4 9/16" });
		input.initialized.issues.push(
			{
				lineUid: "line-1",
				stepId: 2,
				reason: "component-not-visible",
			},
			{
				lineUid: "line-1",
				stepId: 3,
				reason: "component-price-missing",
			},
		);
		const initializedLine = input.initialized.record.lineItems[0];
		if (!initializedLine)
			throw new Error("Expected the initialized test line.");
		initializedLine.shelfItems = [{ uid: "shelf-1" }];

		expect(
			evaluateSalesRequestLowTouchDraftEligibility(input).reasons.map(
				(reason) => reason.code,
			),
		).toEqual([
			"unresolved-facts",
			"custom-value",
			"initializer-issue",
			"unpriced-component",
			"shelf-items-not-supported",
		]);
	});

	test("fails closed when any commercial fact or permission is not current", () => {
		const input = eligibleInput();
		input.initialized.record.form.customerId = null;
		input.current.configuration = false;
		input.current.providerBenchmark = false;
		input.current.prices = false;
		input.current.permissions = false;

		expect(
			evaluateSalesRequestLowTouchDraftEligibility(input).reasons.map(
				(reason) => reason.code,
			),
		).toEqual([
			"customer-required",
			"configuration-stale",
			"provider-not-proven",
			"prices-stale",
			"permissions-stale",
		]);
	});

	test("does not accept an image or mailbox source even through an untyped caller", () => {
		for (const source of ["image", "mailbox"]) {
			const input = { ...eligibleInput(), source };
			expect(
				evaluateSalesRequestLowTouchDraftEligibility(
					input as Parameters<
						typeof evaluateSalesRequestLowTouchDraftEligibility
					>[0],
				),
			).toEqual({
				eligible: false,
				reasons: [{ code: "source-not-supported" }],
			});
		}
	});
});
