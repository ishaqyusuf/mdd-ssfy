import { describe, expect, it } from "bun:test";
import { resolveSalesOrderSpecialOrderIndicator } from "./special-order-indicator";

describe("Sales Orders Special Order indicator", () => {
	it("hides ordinary and legacy orders", () => {
		expect(
			resolveSalesOrderSpecialOrderIndicator({ declaration: "NO" }),
		).toBeNull();
		expect(
			resolveSalesOrderSpecialOrderIndicator({ declaration: null }),
		).toBeNull();
	});

	it("uses distinct semantic tones for governed states", () => {
		expect(
			resolveSalesOrderSpecialOrderIndicator({
				declaration: "YES",
				status: "SIGNATURE_PENDING",
				label: "Signature pending",
			})?.toneClassName,
		).toContain("amber");
		expect(
			resolveSalesOrderSpecialOrderIndicator({
				declaration: "YES",
				status: "CUSTOMER_APPROVED",
				label: "Customer approved",
			})?.toneClassName,
		).toContain("emerald");
		expect(
			resolveSalesOrderSpecialOrderIndicator({
				declaration: "YES",
				status: "REAPPROVAL_REQUIRED",
				label: "Reapproval required",
			})?.toneClassName,
		).toContain("orange");
		expect(
			resolveSalesOrderSpecialOrderIndicator({
				declaration: "YES",
				status: "CUSTOMER_DECLINED",
				label: "Customer declined",
			})?.toneClassName,
		).toContain("rose");
	});

	it("gives an expired current link visual precedence", () => {
		const indicator = resolveSalesOrderSpecialOrderIndicator({
			declaration: "YES",
			status: "REAPPROVAL_REQUIRED",
			label: "Reapproval required",
			linkState: "EXPIRED",
		});

		expect(indicator?.label).toBe("Approval link expired");
		expect(indicator?.toneClassName).toContain("violet");
	});
});
