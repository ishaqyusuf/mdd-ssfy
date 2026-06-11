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
		expect(getActiveDealerAuthUserWhere("dealer@example.com", "auth-user-id"))
			.toMatchObject({
				email: "dealer@example.com",
				authUserId: "auth-user-id",
				deletedAt: null,
			});
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
