import { describe, expect, it } from "bun:test";
import { buildGoogleDirectionsUrl } from "./google-route-map";

describe("driver Google route URL", () => {
	it("builds a warehouse route with ordered waypoints", () => {
		const url = new URL(
			buildGoogleDirectionsUrl({
				origin: "13285 SW 131 ST, Miami, FL 33186",
				destinations: [
					{ id: 1, label: "First", address: "101 First St, Miami, FL" },
					{ id: 2, label: "Second", address: "202 Second St, Miami, FL" },
				],
			}),
		);

		expect(url.origin).toBe("https://www.google.com");
		expect(url.searchParams.get("origin")).toBe(
			"13285 SW 131 ST, Miami, FL 33186",
		);
		expect(url.searchParams.get("destination")).toBe(
			"202 Second St, Miami, FL",
		);
		expect(url.searchParams.get("waypoints")).toBe("101 First St, Miami, FL");
	});

	it("omits the origin when the driver chooses current location", () => {
		const url = new URL(
			buildGoogleDirectionsUrl({
				destinations: [
					{ id: 2, label: "Stop", address: "202 Second St, Miami, FL" },
				],
			}),
		);

		expect(url.searchParams.has("origin")).toBe(false);
		expect(url.searchParams.get("travelmode")).toBe("driving");
	});
});
