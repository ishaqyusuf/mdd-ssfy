import { describe, expect, test } from "bun:test";

import {
	getActiveDealerAuthUserWhere,
	getActiveDealerSocialAuthWhere,
} from "./better-auth/dealership";

describe("dealer auth lookup", () => {
	test("treats null restricted as unrestricted for active linked dealers", () => {
		expect(getActiveDealerAuthUserWhere(" Dealer@Example.com ")).toEqual({
			email: "dealer@example.com",
			authUserId: {
				not: null,
			},
			deletedAt: null,
			OR: [{ restricted: false }, { restricted: null }],
			status: {
				in: ["active", "approved"],
			},
		});
	});

	test("can require a specific linked auth user", () => {
		const where = getActiveDealerAuthUserWhere(
			"dealer@example.com",
			"auth-user-id",
		);
		expect(where.email).toBe("dealer@example.com");
		expect(where.authUserId).toBe("auth-user-id");
		expect(where.deletedAt).toBe(null);
	});

	test("allows Google provisioning lookup before a dealer auth user exists", () => {
		expect(getActiveDealerSocialAuthWhere(" Dealer@Example.com ")).toEqual({
			email: "dealer@example.com",
			deletedAt: null,
			OR: [{ restricted: false }, { restricted: null }],
			status: {
				in: ["active", "approved"],
			},
		});
	});
});
