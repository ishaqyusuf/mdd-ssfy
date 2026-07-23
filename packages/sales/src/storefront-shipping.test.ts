import { describe, expect, test } from "bun:test";
import {
	type StorefrontShippingPolicy,
	buildStorefrontShippingQuote,
} from "./storefront-shipping";

const policy: StorefrontShippingPolicy = {
	enabled: true,
	approvalMode: "OFFICE_REVIEW",
	baseDispatchFee: 30,
	baseVehicleRatePerMile: 1.2,
	roundTripMultiplier: 2,
	includedWeightLb: 200,
	weightUnitLb: 100,
	weightDistanceRate: 0.1,
	packagingMultiplier: 1.1,
	weightRoundingIncrementLb: 25,
	minimumCharge: 0,
	maximumCharge: null,
	maxDistanceMiles: 100,
	maxWeightLb: 2_000,
	freeDeliveryThreshold: null,
	autoApprovalMaxDistanceMiles: 40,
	autoApprovalMaxWeightLb: 1_000,
	autoApprovalMaxAmount: 250,
	allowGlobalFallbackForAutoApproval: false,
};

describe("storefront product-aware shipping", () => {
	test("combines door, moulding, and shelf evidence into the configured formula", () => {
		const quote = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 20,
			subtotal: 1_200,
			policy,
			lines: [
				{
					kind: "DOOR",
					key: "door-1",
					description: "Solid core door",
					quantity: 3,
					dimension: "3-0 x 6-8",
					weights: {
						overrideWeightLb: null,
						profileWeightLb: 80,
						globalDefaultWeightLb: 60,
					},
					handlingFeePerUnit: 5,
				},
				{
					kind: "MOULDING",
					key: "moulding-1",
					description: "Casing",
					requestedLinearFeet: 100,
					pieceLengthFeet: 16,
					wastePercentage: 10,
					unitPrice: 24,
					weights: {
						overrideLbPerLinearFoot: null,
						categoryLbPerLinearFoot: 0.5,
						globalDefaultLbPerLinearFoot: 0.35,
					},
				},
				{
					kind: "SHELF",
					key: "shelf-1",
					description: "Hardware",
					quantity: 4,
					weights: {
						overrideWeightPerUnitLb: null,
						childCategoryWeightPerUnitLb: 8,
						parentCategoryWeightPerUnitLb: 6,
						globalDefaultWeightPerUnitLb: 4,
					},
				},
			],
		});

		expect(quote.breakdown.estimatedWeightLb).toBe(328);
		expect(quote.breakdown.chargeableWeightLb).toBe(375);
		expect(quote.breakdown.routeMiles).toBe(40);
		expect(quote.breakdown.distanceCharge).toBe(48);
		expect(quote.breakdown.weightDistanceCharge).toBe(7);
		expect(quote.breakdown.handlingSurcharges).toBe(15);
		expect(quote.amount).toBe(100);
		expect(quote.lines[0]).toMatchObject({
			kind: "DOOR",
			source: "PROFILE",
			weightLb: 240,
		});
		expect(quote.lines[1]).toMatchObject({
			kind: "MOULDING",
			source: "CATEGORY_DEFAULT",
			pieces: 7,
			shippedLinearFeet: 112,
			weightLb: 56,
			productPrice: 168,
		});
		expect(quote.lines[2]).toMatchObject({
			kind: "SHELF",
			source: "CATEGORY_DEFAULT",
			weightLb: 32,
		});
		expect(quote.decision).toBe("PENDING_OFFICE_REVIEW");
	});

	test("uses the strongest configured weight source", () => {
		const quote = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 5,
			subtotal: 100,
			policy,
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Door",
					quantity: 1,
					dimension: "2-8 x 6-8",
					weights: {
						overrideWeightLb: 95,
						profileWeightLb: 80,
						globalDefaultWeightLb: 60,
					},
				},
				{
					kind: "SHELF",
					key: "shelf",
					description: "Shelf",
					quantity: 1,
					weights: {
						overrideWeightPerUnitLb: null,
						childCategoryWeightPerUnitLb: null,
						parentCategoryWeightPerUnitLb: 11,
						globalDefaultWeightPerUnitLb: 4,
					},
				},
			],
		});

		expect(quote.lines[0]).toMatchObject({
			source: "OVERRIDE",
			weightLb: 95,
		});
		expect(quote.lines[1]).toMatchObject({
			source: "CATEGORY_DEFAULT",
			weightLb: 11,
		});
	});

	test("requires manual review for missing weights, route failures, or capacity breaches", () => {
		const unmapped = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 5,
			subtotal: 100,
			policy,
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Unknown door",
					quantity: 1,
					dimension: "9-9 x 9-9",
					weights: {},
				},
			],
		});
		expect(unmapped.decision).toBe("MANUAL_REVIEW_REQUIRED");
		expect(unmapped.blockers).toContain("UNMAPPED_WEIGHT");

		const noRoute = buildStorefrontShippingQuote({
			oneWayDistanceMiles: null,
			subtotal: 100,
			policy,
			lines: [],
		});
		expect(noRoute.blockers).toContain("ROUTE_UNAVAILABLE");

		const overCapacity = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 10,
			subtotal: 100,
			policy: { ...policy, maxWeightLb: 100 },
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Heavy door",
					quantity: 2,
					dimension: "3-0 x 8-0",
					weights: { profileWeightLb: 100 },
				},
			],
		});
		expect(overCapacity.blockers).toContain("WEIGHT_CAPACITY_EXCEEDED");
	});

	test("auto-approves only high-confidence quotes inside every configured gate", () => {
		const automatic = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 10,
			subtotal: 500,
			policy: { ...policy, approvalMode: "AUTO_WHEN_CONFIDENT" },
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Known door",
					quantity: 1,
					dimension: "3-0 x 6-8",
					weights: { profileWeightLb: 80 },
				},
			],
		});
		expect(automatic.decision).toBe("AUTO_APPROVED");

		const globalFallback = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 10,
			subtotal: 500,
			policy: { ...policy, approvalMode: "AUTO_WHEN_CONFIDENT" },
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Fallback door",
					quantity: 1,
					dimension: "3-0 x 6-8",
					weights: { globalDefaultWeightLb: 80 },
				},
			],
		});
		expect(globalFallback.decision).toBe("PENDING_OFFICE_REVIEW");
		expect(globalFallback.autoApprovalBlockers).toContain(
			"GLOBAL_FALLBACK_NOT_ALLOWED",
		);

		const amountGate = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 10,
			subtotal: 500,
			policy: {
				...policy,
				approvalMode: "AUTO_WHEN_CONFIDENT",
				autoApprovalMaxAmount: 1,
			},
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Known door",
					quantity: 1,
					dimension: "3-0 x 6-8",
					weights: { profileWeightLb: 80 },
				},
			],
		});
		expect(amountGate.decision).toBe("PENDING_OFFICE_REVIEW");
		expect(amountGate.autoApprovalBlockers).toContain(
			"AUTO_AMOUNT_LIMIT_EXCEEDED",
		);

		const missingGates = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 10,
			subtotal: 500,
			policy: {
				...policy,
				approvalMode: "AUTO_WHEN_CONFIDENT",
				autoApprovalMaxDistanceMiles: null,
			},
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Known door",
					quantity: 1,
					dimension: "3-0 x 6-8",
					weights: { profileWeightLb: 80 },
				},
			],
		});
		expect(missingGates.decision).toBe("PENDING_OFFICE_REVIEW");
		expect(missingGates.autoApprovalBlockers).toContain(
			"AUTO_GATES_NOT_CONFIGURED",
		);
	});

	test("checks eligibility before applying free delivery", () => {
		const free = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 10,
			subtotal: 2_000,
			policy: { ...policy, freeDeliveryThreshold: 1_500 },
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Known door",
					quantity: 1,
					dimension: "3-0 x 6-8",
					weights: { profileWeightLb: 80 },
				},
			],
		});
		expect(free.amount).toBe(0);
		expect(free.breakdown.freeDeliveryApplied).toBe(true);

		const outOfArea = buildStorefrontShippingQuote({
			oneWayDistanceMiles: 101,
			subtotal: 2_000,
			policy: { ...policy, freeDeliveryThreshold: 1_500 },
			lines: [
				{
					kind: "DOOR",
					key: "door",
					description: "Known door",
					quantity: 1,
					dimension: "3-0 x 6-8",
					weights: { profileWeightLb: 80 },
				},
			],
		});
		expect(outOfArea.blockers).toContain("OUTSIDE_SERVICE_AREA");
		expect(outOfArea.breakdown.freeDeliveryApplied).toBe(false);
		expect(outOfArea.decision).toBe("MANUAL_REVIEW_REQUIRED");
	});
});
