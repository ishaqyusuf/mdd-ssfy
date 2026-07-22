import { describe, expect, it } from "bun:test";
import {
	isProductionSquareEnvironment,
	normalizeTerminalDeviceId,
	resolvePairedSquareTerminals,
} from "../src/index";

describe("Square runtime environment", () => {
	it("uses production for deployed production runtimes", () => {
		expect(isProductionSquareEnvironment({ NODE_ENV: "production" })).toBe(
			true,
		);
		expect(isProductionSquareEnvironment({ VERCEL_ENV: "production" })).toBe(
			true,
		);
	});

	it("keeps local development in sandbox unless explicitly overridden", () => {
		expect(isProductionSquareEnvironment({ NODE_ENV: "development" })).toBe(
			false,
		);
		expect(
			isProductionSquareEnvironment({
				NODE_ENV: "development",
				SQUARE_FORCE_PRODUCTION: "true",
			}),
		).toBe(true);
	});
});

describe("Square terminal device ids", () => {
	it("normalizes device-list ids for Terminal API checkout requests", () => {
		expect(normalizeTerminalDeviceId("device:238CS149B2002443")).toBe(
			"238CS149B2002443",
		);
		expect(normalizeTerminalDeviceId("238CS149B2002443")).toBe(
			"238CS149B2002443",
		);
	});

	it("exposes only terminals paired to this Square application", () => {
		expect(
			resolvePairedSquareTerminals(
				[
					{
						attributes: { name: "Terminal 1451" },
						id: "device:1451",
						status: { category: "AVAILABLE" },
					},
					{
						attributes: { name: "Terminal 2443" },
						id: "device:2443",
						status: { category: "AVAILABLE" },
					},
				],
				[
					{
						deviceId: "1451",
						productType: "TERMINAL_API",
						status: "PAIRED",
					},
				],
			),
		).toEqual([
			{
				label: "Terminal 1451",
				status: "AVAILABLE",
				value: "device:1451",
			},
		]);
	});
});
