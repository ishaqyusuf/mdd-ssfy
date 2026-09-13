import { describe, expect, test } from "bun:test";
import { requireActiveSalesRequestMailboxEmployees } from "./sales-request-mailbox-employees";

function database(
	rows: Array<{
		id: number;
		type: "EMPLOYEE" | "CUSTOMER" | null;
		employeeProfileId: number | null;
	}>,
) {
	return {
		users: {
			findMany: async () => rows,
		},
	} as never;
}

describe("Sales Request mailbox employee eligibility", () => {
	test("accepts only active employee identities with an employee profile", async () => {
		await expect(
			requireActiveSalesRequestMailboxEmployees({
				db: database([
					{ id: 2, type: "EMPLOYEE", employeeProfileId: 12 },
					{ id: 8, type: "EMPLOYEE", employeeProfileId: 18 },
				]),
				userIds: [8, 2, 8],
			}),
		).resolves.toBeUndefined();
	});

	test("rejects customers, missing profiles, and missing or inactive rows", async () => {
		await expect(
			requireActiveSalesRequestMailboxEmployees({
				db: database([
					{ id: 2, type: "CUSTOMER", employeeProfileId: null },
					{ id: 8, type: "EMPLOYEE", employeeProfileId: null },
				]),
				userIds: [2, 8, 11],
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});
