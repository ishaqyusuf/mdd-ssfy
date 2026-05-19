import { describe, expect, it } from "bun:test";
import { whereEmployees } from "./prisma-where";
import { employeesQueryParamsSchema } from "./schemas/hrm";

describe("employees query params schema", () => {
	it("preserves q for employee search", () => {
		const parsed = employeesQueryParamsSchema.parse({
			q: "Jane",
			role: "Manager",
			accessStatus: "revoked",
		});

		expect(parsed.q).toBe("Jane");
		expect(parsed.role).toBe("Manager");
		expect(parsed.accessStatus).toBe("revoked");
	});
});

describe("whereEmployees", () => {
	it("adds text search across employee fields", () => {
		const where = whereEmployees({
			q: "Jane",
		});

		expect(where).toEqual({
			AND: [
				{ accessRevokedAt: null },
				{
					OR: [
						{ name: { contains: "Jane" } },
						{ email: { contains: "Jane" } },
						{ username: { contains: "Jane" } },
						{ phoneNo: { contains: "Jane" } },
						{
							employeeProfile: {
								name: { contains: "Jane" },
							},
						},
					],
				},
			],
			OR: undefined,
		});
	});

	it("filters revoked employee access when requested", () => {
		const where = whereEmployees({
			accessStatus: "revoked",
		});

		expect(where).toEqual({
			accessRevokedAt: { not: null },
		});
	});
});
