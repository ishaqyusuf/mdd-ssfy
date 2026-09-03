import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { getSalesOrderPoBadgeValue } from "./po-badge";

const columnsSource = readFileSync(
	new URL("./columns.tsx", import.meta.url),
	"utf8",
);

describe("Sales Orders P.O. badge", () => {
	it("shows only meaningful P.O. values", () => {
		expect(getSalesOrderPoBadgeValue("PO-77")).toBe("PO-77");
		expect(getSalesOrderPoBadgeValue("  PO-88  ")).toBe("PO-88");
	});

	it("renders nothing when an order has no P.O.", () => {
		expect(getSalesOrderPoBadgeValue(null)).toBeNull();
		expect(getSalesOrderPoBadgeValue(undefined)).toBeNull();
		expect(getSalesOrderPoBadgeValue("")).toBeNull();
		expect(getSalesOrderPoBadgeValue("   ")).toBeNull();
		expect(getSalesOrderPoBadgeValue("-")).toBeNull();
		expect(getSalesOrderPoBadgeValue("  -  ")).toBeNull();
	});

	it("moves P.O. into the Order # cell instead of a standalone column", () => {
		expect(columnsSource).toContain(
			"<SalesOrderPoBadge poNo={row.original.poNo} />",
		);
		expect(columnsSource).not.toContain("const poColumn");
		expect(columnsSource).not.toContain("\tpoColumn,");
		expect(columnsSource).toContain("aria-label={label}");
		expect(columnsSource).toContain("max-w-[88px]");
		expect(columnsSource).toContain('className="min-w-0 truncate"');
		expect(columnsSource).toContain(">{label}</TooltipContent>");
	});
});
