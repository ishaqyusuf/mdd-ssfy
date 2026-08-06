import { describe, expect, it } from "bun:test";
import { formatGooglePlaceAddress, searchGooglePlace } from "./google-place";

describe("Google Place address formatting", () => {
	it("populates locality fields from address components", () => {
		expect(
			formatGooglePlaceAddress(
				{
					addressComponents: [
						{ longText: "11211", types: ["street_number"] },
						{ longText: "Southwest 138th Terrace", types: ["route"] },
						{ longText: "Miami", types: ["locality"] },
						{
							longText: "Florida",
							shortText: "FL",
							types: ["administrative_area_level_1"],
						},
						{ longText: "33176", types: ["postal_code"] },
						{
							longText: "United States",
							shortText: "US",
							types: ["country"],
						},
					],
					formattedAddress:
						"11211 Southwest 138th Terrace, Miami, FL 33176, USA",
					location: { latitude: 25.6407, longitude: -80.3716 },
				},
				"place-123",
			),
		).toMatchObject({
			address1: "11211 Southwest 138th Terrace",
			city: "Miami",
			country: "United States",
			placeId: "place-123",
			postalCode: "33176",
			region: "FL",
			state: "FL",
		});
	});

	it("uses postal-town and ZIP suffix fallbacks when supplied by Google", () => {
		expect(
			formatGooglePlaceAddress(
				{
					addressComponents: [
						{ longText: "Example Road", types: ["route"] },
						{ longText: "Doral", types: ["postal_town"] },
						{
							longText: "Florida",
							shortText: "FL",
							types: ["administrative_area_level_1"],
						},
						{ longText: "33122", types: ["postal_code"] },
						{ longText: "1234", types: ["postal_code_suffix"] },
						{ longText: "United States", types: ["country"] },
					],
				},
				"place-456",
			),
		).toMatchObject({
			address1: "Example Road",
			city: "Doral",
			postalCode: "33122-1234",
			state: "FL",
		});
	});
});

describe("Google Place autocomplete request", () => {
	it("filters with supported primary place types", async () => {
		const originalFetch = globalThis.fetch;
		let requestBody: { includedPrimaryTypes?: string[] } | undefined;
		globalThis.fetch = (async (_url, init) => {
			requestBody = JSON.parse(String(init?.body));
			return new Response(JSON.stringify({ suggestions: [] }), { status: 200 });
		}) as typeof fetch;

		try {
			await searchGooglePlace(null, { q: "11211 SW 138th Terrace" });
		} finally {
			globalThis.fetch = originalFetch;
		}

		expect(requestBody?.includedPrimaryTypes).toEqual([
			"street_address",
			"subpremise",
			"route",
			"premise",
			"landmark",
		]);
	});
});
