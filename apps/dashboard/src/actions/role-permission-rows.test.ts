import { describe, expect, test } from "bun:test";

import {
	getRolePermissionRows,
	getStaticRolePermissionNames,
} from "./role-permission-rows";

describe("role permission rows", () => {
	test("persists exactly the canonical status-only Sales completion rows", () => {
		const rows = getStaticRolePermissionNames().filter((permission) =>
			permission.includes("status only sales completion"),
		);

		expect(rows).toEqual([
			"view status only sales completion",
			"edit status only sales completion",
		]);
		expect(rows.includes("status_only_sales_completion")).toBe(false);
	});

	test("presents the view/edit pair as one scoped role resource", () => {
		const rows = getRolePermissionRows([
			{ name: "view status only sales completion" },
			{ name: "edit status only sales completion" },
		]);

		expect(rows).toEqual([
			{ permission: "status only sales completion", kind: "scoped" },
		]);
	});
});
