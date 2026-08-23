import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./dispatch.ts", import.meta.url), "utf8");

describe("dispatch packing item presentation", () => {
	test("projects canonical Production rows before stale persisted controls", () => {
		expect(
			source.includes(
				"const canonicalDispatchItemUids = new Set(\n\t\tresult.dispatchables.map((item) => item.uid)",
			),
		).toBe(true);
		expect(
			source.includes(
				"...result.dispatchables.map((dispatchable) => ({",
			),
		).toBe(true);
		expect(
			source.includes(
				".filter((item) => !canonicalDispatchItemUids.has(item.uid))",
			),
		).toBe(true);
		expect(source.includes("const uid = dispatchable?.uid ?? item!.uid")).toBe(
			true,
		);
		expect(
			source.match(/title: dispatchable\?\.title \|\| item\?\.title/g)
				?.length,
		).toBeGreaterThanOrEqual(2);
		expect(
			source.includes(
				"dispatchable?.sectionTitle || item?.sectionTitle || \"\"",
			),
		).toBe(true);
		expect(
			source.includes(
				"subtitle: dispatchable?.subtitle || item?.sectionTitle || \"\"",
			),
		).toBe(true);
	});
});
