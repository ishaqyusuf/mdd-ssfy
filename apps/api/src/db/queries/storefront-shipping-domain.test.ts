import { describe, expect, test } from "bun:test";
import {
	buildFinalizedStorefrontCheckoutTotals,
	canonicalizeStorefrontShippingAddress,
	isStorefrontShippingPaymentLocked,
	requiresStorefrontShippingOverrideReason,
} from "./storefront-shipping-domain";

const customerAddress = {
	name: "Customer",
	email: "customer@example.com",
	phone: "3055550100",
	country: "US",
	address1: "Tampered address",
	address2: "Suite 4",
	city: "Wrong city",
	state: "FL",
	postalCode: "00000",
	placeId: "quoted-place",
	formattedAddress: "Tampered address",
};

describe("storefront shipping persistence guards", () => {
	test("replaces delivery location fields with the quoted canonical Place", () => {
		expect(
			canonicalizeStorefrontShippingAddress(customerAddress, {
				placeId: "quoted-place",
				formattedAddress: "100 Main St, Miami, FL 33101, USA",
				address1: "100 Main St",
				city: "Miami",
				state: "Florida",
				postalCode: "33101",
				country: "United States",
				lat: 25.77,
				lng: -80.19,
			}),
		).toEqual({
			...customerAddress,
			placeId: "quoted-place",
			formattedAddress: "100 Main St, Miami, FL 33101, USA",
			address1: "100 Main St",
			city: "Miami",
			state: "Florida",
			postalCode: "33101",
			country: "United States",
			lat: 25.77,
			lng: -80.19,
		});
	});

	test("locks shipping as soon as payment starts", () => {
		expect(
			isStorefrontShippingPaymentLocked({
				status: "ORDER_CREATED",
				paymentReference: "square-link",
			}),
		).toBe(true);
		expect(
			isStorefrontShippingPaymentLocked({
				status: "PAYMENT_PENDING",
				paymentReference: null,
			}),
		).toBe(true);
		expect(
			isStorefrontShippingPaymentLocked({
				status: "ORDER_CREATED",
				paymentReference: null,
			}),
		).toBe(false);
	});

	test("requires a note only when the office changes the amount", () => {
		expect(
			requiresStorefrontShippingOverrideReason({
				calculatedAmount: 125,
				finalAmount: 125,
			}),
		).toBe(false);
		expect(
			requiresStorefrontShippingOverrideReason({
				calculatedAmount: 125,
				finalAmount: 140,
				reviewNote: "Long-item handling",
			}),
		).toBe(false);
		expect(
			requiresStorefrontShippingOverrideReason({
				calculatedAmount: 125,
				finalAmount: 140,
			}),
		).toBe(true);
	});

	test("rebuilds checkout and card totals from the final delivery amount", () => {
		expect(
			buildFinalizedStorefrontCheckoutTotals(
				{
					subtotal: 1_000,
					tax: 70,
					delivery: 100,
					cardFeePercentage: 3,
				},
				140,
			),
		).toEqual({
			oldDelivery: 100,
			delta: 40,
			totals: {
				subtotal: 1_000,
				tax: 70,
				delivery: 140,
				cardFeePercentage: 3,
				orderTotal: 1_210,
				paymentFee: 36.3,
				paymentTotal: 1_246.3,
			},
		});
	});
});
