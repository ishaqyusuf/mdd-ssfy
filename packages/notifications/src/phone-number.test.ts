// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import {
	isValidCustomerPhoneNumber,
	normalizeCustomerPhoneNumber,
} from "./phone-number";

describe("customer phone normalization", () => {
	test("normalizes North American local and E.164 numbers", () => {
		expect(normalizeCustomerPhoneNumber("(305) 555-0100")).toBe("+13055550100");
		expect(normalizeCustomerPhoneNumber("+234 803 123 4567")).toBe(
			"+2348031234567",
		);
	});

	test("rejects ambiguous short values", () => {
		expect(normalizeCustomerPhoneNumber("555-0100")).toBeNull();
		expect(isValidCustomerPhoneNumber("")).toBe(false);
	});
});
