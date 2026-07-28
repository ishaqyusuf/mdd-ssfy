import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	getDealerSaleOrderCellClassName,
	getDealerSaleOrderNumberClassName,
} from "./dealer-sale-style";

const source = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), "columns.tsx"),
	"utf8",
);

describe("dealer sale order number", () => {
	it("uses the dealer accent and border only for dealer sales", () => {
		expect(getDealerSaleOrderNumberClassName(true)).toBe(
			"text-cyan-700 dark:text-cyan-400",
		);
		expect(getDealerSaleOrderNumberClassName(false)).toBeUndefined();
		expect(getDealerSaleOrderCellClassName(true)).toBe(
			"-my-2 -ml-2 w-[calc(100%+0.5rem)] border-l-3 border-cyan-700 py-2 pl-2 dark:border-cyan-400",
		);
		expect(getDealerSaleOrderCellClassName(false)).toBeUndefined();
	});

	it("removes the visible dealer badge while retaining screen-reader context", () => {
		expect(source.includes("function DealerSaleBadge")).toBe(false);
		expect(source.includes("<DealerSaleBadge")).toBe(false);
		expect(
			source.includes('<span className="sr-only">Dealer sale</span>'),
		).toBe(true);
	});
});
