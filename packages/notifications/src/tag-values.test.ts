// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { getTagQueryValues } from "./tag-values";

describe("notification tag query compatibility", () => {
	test("matches canonical JSON and legacy raw string tags", () => {
		expect(getTagQueryValues("inventory_inbound")).toEqual([
			'"inventory_inbound"',
			"inventory_inbound",
		]);
		expect(getTagQueryValues("08651AD")).toEqual(['"08651AD"', "08651AD"]);
	});

	test("does not duplicate values whose canonical and legacy forms are equal", () => {
		expect(getTagQueryValues(23521)).toEqual(["23521"]);
		expect(getTagQueryValues(true)).toEqual(["true"]);
	});
});
