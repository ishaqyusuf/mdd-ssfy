import { describe, expect, test } from "bun:test";
import { summarizeStockVariants } from "./stock-status";

describe("component stock alerts", () => {
	test("a muted shortage does not hide available stock or warn on a healthy variant", () => {
		expect(
			summarizeStockVariants([
				{ alertsEnabled: false, level: "out_of_stock" },
				{ alertsEnabled: true, level: "available" },
			]),
		).toBe("available");
	});
	test("mixed stock is not classified as all out of stock", () => {
		expect(
			summarizeStockVariants([
				{ alertsEnabled: true, level: "out_of_stock" },
				{ alertsEnabled: true, level: "available" },
			]),
		).toBe("mixed");
		expect(
			summarizeStockVariants([
				{ alertsEnabled: true, level: "out_of_stock" },
				{ alertsEnabled: true, level: "out_of_stock" },
			]),
		).toBe("out_of_stock");
	});
	test("muting every variant stays neutral rather than reporting availability", () => {
		expect(
			summarizeStockVariants([
				{ alertsEnabled: false, level: "available" },
				{ alertsEnabled: false, level: "out_of_stock" },
			]),
		).toBe("alerts_off");
	});
});
