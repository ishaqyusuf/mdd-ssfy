import { describe, expect, it } from "bun:test";

import {
	PERMISSIONS,
	PERMISSION_NAMES_PASCAL,
	generatePermissions,
} from "./constants";

describe("status-only sales completion permissions", () => {
	it("registers the canonical view/edit resource without a raw compatibility scope", () => {
		expect(PERMISSION_NAMES_PASCAL).toContain("StatusOnlySalesCompletion");
		expect(
			PERMISSIONS.filter((permission) =>
				permission.toLowerCase().includes("statusonlysalescompletion"),
			),
		).toEqual([
			"viewStatusOnlySalesCompletion",
			"editStatusOnlySalesCompletion",
		]);
		expect(PERMISSIONS.includes("status_only_sales_completion" as never)).toBe(
			false,
		);
	});

	it("normalizes the exact persisted rows to independent runtime capabilities", () => {
		const viewOnly = generatePermissions("Sales", [
			{ name: "view status only sales completion" },
		]);
		const editOnly = generatePermissions("Sales", [
			{ name: "edit status only sales completion" },
		]);

		expect(viewOnly.viewStatusOnlySalesCompletion).toBe(true);
		expect(viewOnly.editStatusOnlySalesCompletion).toBe(false);
		expect(editOnly.viewStatusOnlySalesCompletion).toBe(false);
		expect(editOnly.editStatusOnlySalesCompletion).toBe(true);
	});

	it("does not grant either capability from a single snake-case row", () => {
		const can = generatePermissions("Sales", [
			{ name: "status_only_sales_completion" },
		]);

		expect(can.viewStatusOnlySalesCompletion).toBe(false);
		expect(can.editStatusOnlySalesCompletion).toBe(false);
	});
});
