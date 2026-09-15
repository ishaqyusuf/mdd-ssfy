import { describe, expect, it } from "bun:test";

import {
	activeCompanyRoleAssignmentWhere,
	getActiveCompanyMemberWhere,
} from "./company-member";

describe("live company-member predicate", () => {
	it("requires internal type, live account, role, and organization", () => {
		expect(getActiveCompanyMemberWhere({ id: 42 })).toEqual({
			id: 42,
			deletedAt: null,
			accessRevokedAt: null,
			OR: [{ type: null }, { type: { in: ["EMPLOYEE", "MANAGER"] } }],
			roles: {
				some: {
					deletedAt: null,
					role: { deletedAt: null },
					organization: { deletedAt: null },
				},
			},
		});
	});

	it("keeps one reusable assignment predicate for role reads", () => {
		expect(getActiveCompanyMemberWhere().roles).toEqual({
			some: activeCompanyRoleAssignmentWhere,
		});
		expect(getActiveCompanyMemberWhere({ email: "staff@example.com" }).email).toBe(
			"staff@example.com",
		);
	});
});
