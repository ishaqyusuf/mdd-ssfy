import { describe, expect, it } from "bun:test";
import { readSalesFormObjectMetadata } from "./metadata";

describe("sales form metadata", () => {
	it("reads object metadata", () => {
		expect(readSalesFormObjectMetadata({ custom: true })).toEqual({
			custom: true,
		});
	});

	it("reads JSON-string metadata", () => {
		expect(readSalesFormObjectMetadata(JSON.stringify({ custom: true }))).toEqual(
			{
				custom: true,
			},
		);
	});

	it("ignores invalid or non-object metadata", () => {
		expect(readSalesFormObjectMetadata("not-json")).toBeNull();
		expect(readSalesFormObjectMetadata(["custom"])).toBeNull();
	});
});
