import { describe, expect, test } from "bun:test";

import { getActiveDealerAuthUserWhere } from "./better-auth/dealership";

describe("dealer auth lookup", () => {
	test("treats null restricted as unrestricted for active linked dealers", () => {
		expect(getActiveDealerAuthUserWhere(" Dealer@Example.com ")).toEqual({
			email: "dealer@example.com",
			authUserId: {
				not: null,
			},
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
			});
	});
});
