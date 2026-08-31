import { describe, expect, it } from "bun:test";

import {
	createDriverRouteDestination,
	formatDriverRouteAddress,
	isDriverAssignmentDestinationReady,
	resolveDriverRouteDestination,
} from "./driver-destination";

const primary = {
	address1: "100 Primary Ave",
	city: "Miami",
	state: "FL",
	country: "US",
	meta: {},
};

const confirmed = {
	address1: "200 Delivery Rd",
	address2: "Dock 4",
	city: "Miami",
	state: "FL",
	postalCode: "33176",
	country: "US",
	formattedAddress: "200 Delivery Rd, Miami, FL 33176",
	lat: 25.65,
	lng: -80.31,
	placeId: "place-200",
};

describe("driver route destination", () => {
	it("uses primary Google metadata without a duplicate secondary address", () => {
		const destination = resolveDriverRouteDestination({
			primaryAddress: {
				...primary,
				meta: {
					placeId: "place-100",
					lat: 25.64,
					lng: -80.32,
					formattedAddress: "100 Primary Ave, Miami, FL",
				},
			},
			deliveryMode: "delivery",
		});

		expect(destination).toMatchObject({
			source: "primary",
			verified: true,
			requiresNormalization: false,
			displaySecondary: false,
		});
	});

	it("keeps a differing driver-confirmed destination secondary to primary", () => {
		const destination = resolveDriverRouteDestination({
			primaryAddress: primary,
			deliveryMeta: { driverRouteDestination: confirmed },
			deliveryMode: "delivery",
		});

		expect(destination).toMatchObject({
			source: "driver_confirmed",
			verified: true,
			displaySecondary: true,
			route: { placeId: "place-200", lat: 25.65, lng: -80.31 },
		});
		expect(formatDriverRouteAddress(destination.route)).toBe(
			"200 Delivery Rd, Miami, FL 33176",
		);
	});

	it("requires normalization when legacy text has no Google route identity", () => {
		expect(
			resolveDriverRouteDestination({
				primaryAddress: primary,
				deliveryMode: "delivery",
			}),
		).toMatchObject({ verified: false, requiresNormalization: true });
	});

	it("requires a Google-verified order address before driver assignment", () => {
		expect(
			isDriverAssignmentDestinationReady({
				primaryAddress: primary,
				deliveryMode: "delivery",
			}),
		).toBe(false);
		expect(
			isDriverAssignmentDestinationReady({
				primaryAddress: {
					...primary,
					meta: {
						placeId: "place-100",
						lat: 25.64,
						lng: -80.32,
						formattedAddress: "100 Primary Ave, Miami, FL",
					},
				},
				deliveryMode: "delivery",
			}),
		).toBe(true);
		expect(
			isDriverAssignmentDestinationReady({
				primaryAddress: null,
				deliveryMode: "pickup",
			}),
		).toBe(true);
	});

	it("creates versioned confirmation evidence without rewriting primary", () => {
		expect(
			createDriverRouteDestination({
				address: confirmed,
				primaryAddress: primary,
				confirmedAt: "2026-08-29T20:00:00.000Z",
				confirmedById: 17,
			}),
		).toMatchObject({
			version: 1,
			placeId: "place-200",
			confirmedById: 17,
			matchesPrimary: false,
		});
	});
});
